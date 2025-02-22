import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  Snackbar,
  Box,
  Link,
  Stack,
} from "@mui/material";
import {
  PlayArrow,
  Delete,
  Sync,
  OpenInNew,
  VolumeUp,
  VolumeOff,
  Favorite,
  FavoriteBorder,
  Comment,
  Share,
} from "@mui/icons-material";
import ReactPlayer from "react-player";
import axios from "axios";
import { useInView } from "react-intersection-observer";

interface Video {
  id: number;
  title: string;
  description: string;
  cloudFrontUrl: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

const VideoPlayer: React.FC<{
  video: Video;
  onEnded?: () => void;
}> = ({ video, onEnded }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<ReactPlayer>(null);
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.7,
  });

  useEffect(() => {
    setIsPlaying(inView);
  }, [inView]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleMute = () => setIsMuted(!isMuted);
  const toggleLike = () => setIsLiked(!isLiked);

  return (
    <Box
      ref={inViewRef}
      sx={{
        position: "relative",
        height: "100vh",
        bgcolor: "black",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        scrollSnapAlign: "start",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          maxHeight: "100vh",
          cursor: "pointer",
        }}
        onClick={togglePlay}
      >
        <ReactPlayer
          ref={playerRef}
          url={video.cloudFrontUrl}
          playing={isPlaying}
          muted={isMuted}
          loop
          width="100%"
          height="100%"
          style={{ objectFit: "contain" }}
          onError={(e) => setError(e.message)}
          onEnded={onEnded}
          config={{
            file: {
              attributes: {
                crossOrigin: "anonymous",
                controlsList: "nodownload",
              },
            },
          }}
        />

        {/* Video Controls Overlay */}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
            color: "white",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Video Info */}
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {video.title || getVideoFileName(video.cloudFrontUrl)}
          </Typography>
          {video.description && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              {video.description}
            </Typography>
          )}

          {/* Action Buttons */}
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                sx={{ color: "white" }}
              >
                {isMuted ? <VolumeOff /> : <VolumeUp />}
              </IconButton>
            </Box>
            <Stack direction="column" spacing={2} alignItems="center">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLike();
                }}
                sx={{ color: "white" }}
              >
                {isLiked ? (
                  <Favorite sx={{ color: "#ff4081" }} />
                ) : (
                  <FavoriteBorder />
                )}
              </IconButton>
              <IconButton sx={{ color: "white" }}>
                <Comment />
              </IconButton>
              <IconButton sx={{ color: "white" }}>
                <Share />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        {/* Play/Pause Overlay */}
        {!isPlaying && (
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <IconButton
              sx={{
                color: "white",
                bgcolor: "rgba(0,0,0,0.5)",
                "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
              }}
              onClick={handlePlay}
            >
              <PlayArrow sx={{ fontSize: 48 }} />
            </IconButton>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ position: "absolute", top: 16, mx: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Box>
  );
};

const VideoFeed: React.FC<{ videos: Video[] }> = ({ videos }) => {
  return (
    <Box
      sx={{
        height: "90vh",
        overflowY: "auto",
        bgcolor: "black",
        scrollSnapType: "y mandatory",
        "&::-webkit-scrollbar": {
          display: "none",
        },
        msOverflowStyle: "none",
        scrollbarWidth: "none",
      }}
    >
      {videos.map((video) => (
        <VideoPlayer key={video.id} video={video} />
      ))}
    </Box>
  );
};

const VideoManager: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    syncVideos(); // Auto-sync on mount
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/videos`
      );
      console.log("Fetched videos:", response.data);
      setVideos(response.data);
    } catch (error) {
      console.error("Error fetching videos:", error);
      setSnackbar({
        open: true,
        message: "Error fetching videos",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncVideos = async () => {
    setSyncLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/videos/sync`
      );
      console.log("Sync response:", response.data);
      await fetchVideos();
      setSnackbar({
        open: true,
        message: `Videos synced successfully. Found ${response.data.syncedCount} new videos.`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error syncing videos:", error);
      setSnackbar({
        open: true,
        message:
          "Error syncing videos: " + (error as any)?.response?.data?.error ||
          "Unknown error",
        severity: "error",
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("video", file);
    formData.append("title", title || file.name);
    formData.append("description", description);

    setLoading(true);
    setUploadProgress(0);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/videos/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            setUploadProgress(progress);
          },
        }
      );

      console.log("Upload response:", response.data);
      setTitle("");
      setDescription("");
      fetchVideos();
      setSnackbar({
        open: true,
        message: "Video uploaded successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error uploading video:", error);
      setSnackbar({
        open: true,
        message:
          "Error uploading video: " + (error as any)?.response?.data?.error ||
          "Unknown error",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSelect = (video: Video) => {
    console.log("Selected video:", video);
    setPlayerError(null);
    setSelectedVideo(video);

    // Test video URL accessibility
    const videoElement = document.createElement("video");
    videoElement.src = video.cloudFrontUrl;

    videoElement.onerror = () => {
      console.error("Video loading error:", videoElement.error);
      setPlayerError(
        `Error loading video: ${videoElement.error?.message || "Unknown error"}`
      );
    };
  };

  const handlePlayerError = (error: any) => {
    console.error("Player error:", error);
    setPlayerError(
      `Error playing video: ${error.message || "Unknown error"}\nURL: ${
        selectedVideo?.cloudFrontUrl
      }`
    );
  };

  const handlePlayerReady = () => {
    console.log("Player ready");
    setPlayerError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getVideoFileName = (url: string) => {
    try {
      const parts = url.split("/");
      const fileName = parts[parts.length - 1];
      return decodeURIComponent(fileName.split(".")[0]);
    } catch (error) {
      return "Unknown";
    }
  };

  const openInNewTab = (url: string) => {
    window.open(url, "_blank");
  };

  const handleVideoEnd = () => {
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Grid
              container
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Typography variant="h5">Upload Video</Typography>
              <Button
                variant="outlined"
                startIcon={<Sync />}
                onClick={syncVideos}
                disabled={syncLoading}
              >
                {syncLoading ? "Syncing..." : "Sync from S3"}
              </Button>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <input
                  accept="video/*"
                  style={{ display: "none" }}
                  id="video-upload"
                  type="file"
                  onChange={handleFileUpload}
                />
                <label htmlFor="video-upload">
                  <Button
                    variant="contained"
                    component="span"
                    fullWidth
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <CircularProgress size={24} sx={{ mr: 1 }} />
                        {uploadProgress}%
                      </>
                    ) : (
                      "Upload Video"
                    )}
                  </Button>
                </label>
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h5" gutterBottom>
              Video List {videos.length > 0 && `(${videos.length})`}
            </Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <List>
                {videos.map((video) => (
                  <ListItem
                    key={video.id}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => handleVideoSelect(video)}
                      >
                        <PlayArrow />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={
                        video.title || getVideoFileName(video.cloudFrontUrl)
                      }
                      secondary={
                        <>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            component="div"
                          >
                            Size: {formatFileSize(video.size)}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            component="div"
                          >
                            Uploaded: {formatDate(video.createdAt)}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            component="div"
                            sx={{
                              wordBreak: "break-all",
                              opacity: 0.7,
                              fontSize: "0.7rem",
                            }}
                          >
                            {video.cloudFrontUrl}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
                {videos.length === 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ p: 2 }}
                  >
                    No videos found. Upload a video or sync from S3.
                  </Typography>
                )}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              height: "90vh",
              overflow: "hidden",
              bgcolor: "black",
              position: "relative",
            }}
            ref={containerRef}
          >
            {videos.length > 0 ? (
              <VideoFeed videos={videos} />
            ) : (
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                }}
              >
                {loading ? (
                  <CircularProgress color="inherit" />
                ) : (
                  <Typography variant="body1">
                    No videos available. Upload a video to get started.
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default VideoManager;

import React from "react";
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  Container,
  Tabs,
  Tab,
  Box,
} from "@mui/material";
import EmployeeForm from "./components/EmployeeForm";
import VideoManager from "./components/VideoManager";

const theme = createTheme();

function App() {
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container>
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Employees" />
            <Tab label="Videos" />
          </Tabs>
        </Box>
        {tabValue === 0 ? <EmployeeForm /> : <VideoManager />}
      </Container>
    </ThemeProvider>
  );
}

export default App;

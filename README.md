# AWS CRUD Application with Video Upload

A full-stack application built with React, Node.js, and AWS services for managing employees and video content.

## Features

- Employee Management (CRUD operations)
- Video Upload and Management
- AWS S3 Integration for Video Storage
- CloudFront Distribution for Video Delivery
- Instagram Reels-like Video Player
- Responsive Material-UI Design

## Tech Stack

### Frontend

- React
- TypeScript
- Material-UI
- React Player
- Axios

### Backend

- Node.js
- Express
- Sequelize (MySQL)
- AWS SDK
- Multer S3

### AWS Services

- S3 for video storage
- CloudFront for video delivery
- RDS (MySQL) for database

## Setup Instructions

1. Clone the repository:

```bash
git clone <your-repo-url>
cd aws-crud
```

2. Install dependencies:

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

3. Create environment files:

Frontend (.env):

```
REACT_APP_API_URL=http://localhost:3001/api
```

Backend (.env):

```
PORT=3001
DB_HOST=your-rds-endpoint
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
DB_PORT=3306

AWS_REGION=your-aws-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=your-bucket-name
CLOUDFRONT_DOMAIN=your-cloudfront-domain
```

4. Start the application:

```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from root directory)
npm start
```

## Environment Setup

1. AWS Configuration:

   - Create an S3 bucket
   - Set up CloudFront distribution
   - Configure RDS instance
   - Set up IAM user with appropriate permissions

2. Database Setup:
   - Run the database migration script
   - Configure RDS security groups

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security Note

Make sure to never commit sensitive information like API keys, database credentials, or AWS credentials. Always use environment variables for such sensitive data.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

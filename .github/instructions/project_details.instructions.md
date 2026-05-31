# Project Details: ShopAI

## Overview
ShopAI is an e-commerce platform designed to provide a seamless shopping experience. It features a dynamic product catalog, secure payment processing, and an admin dashboard for managing inventory. The project is divided into two main parts:

1. **Backend**: Built with Node.js, Express.js, and MongoDB, the backend handles API requests, authentication, and database operations.
2. **Frontend**: Developed using React.js and Redux, the frontend provides an interactive user interface for customers and admins.

## Technologies Used
- **Frontend**: React.js, Redux, Tailwind CSS
- **Backend**: Node.js, Express.js, MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Payment Gateway**: Stripe
- **Image Management**: Cloudinary
- **Other Tools**: bcryptjs, express-async-handler

## Project Structure

### Backend
The backend is organized into the following directories:

- **app/**: Contains the main application logic, including middleware and configuration files.
- **config/**: Includes configuration files for database connections and file uploads.
- **controllers/**: Handles the business logic for various features. Each controller corresponds to a specific resource (e.g., products, users).
- **middlewares/**: Contains middleware functions for error handling, authentication, and authorization.
- **model/**: Defines the Mongoose schemas and models for the database.
- **routes/**: Defines the API endpoints and maps them to the appropriate controllers.
- **utils/**: Utility functions for token generation, token verification, etc.

#### Key Controllers
- **brandsCtrl.js**: Manages brand-related operations.
- **categoriesCtrl.js**: Handles category-related operations.
- **productsCtrl.js**: Manages product-related operations, including adding, updating, and deleting products.
- **usersCtrl.js**: Handles user-related operations like registration, login, and profile management.

#### Key Utilities
- **generateToken.js**: Generates JWT tokens for authentication.
- **getTokenFromHeader.js**: Extracts the token from the request header.
- **verifyToken.js**: Verifies the validity of JWT tokens.

### Frontend
The frontend is organized into the following directories:

- **components/**: Contains reusable React components for various parts of the application.
  - **Admin/**: Components for the admin dashboard, including managing categories, products, and orders.
  - **HomePage/**: Components for the homepage, including category and product displays.
  - **Navbar/**: The navigation bar component.
  - **Users/**: Components for user-related features like forms, payments, and reviews.
- **redux/**: Contains Redux slices for managing application state.
- **utils/**: Utility functions for handling base URLs and error display.

## Setup Instructions

1. **Prerequisites**:
   - Create accounts in Cloudinary and Stripe.
   - Install Node.js and npm.

2. **Backend Setup**:
   - Navigate to the `Backend/` directory.
   - Run `npm install` to install dependencies.
   - Create a `.env` file with the following variables:
     ```
     JWT_KEY=<your_jwt_key>
     STRIPE_KEY=<your_stripe_key>
     CLOUDINARY_CLOUD_NAME=<your_cloudinary_cloud_name>
     CLOUDINARY_API_KEY=<your_cloudinary_api_key>
     CLOUDINARY_API_SECRET=<your_cloudinary_api_secret>
     MONGO_URL=<your_mongodb_connection_string>
     ```
   - Start the backend server with `npm start`.

3. **Frontend Setup**:
   - Navigate to the `Frontend/` directory.
   - Run `npm install` to install dependencies.
   - Start the frontend server with `npm start`.

4. **Stripe Setup**:
   - Download and configure Stripe CLI.
   - Ensure Stripe is running while testing the project.

## Features

### Admin Features
- Add, update, and delete products.
- Manage categories, brands, and colors.
- View and manage customer orders.

### Customer Features
- Browse products by category, brand, and color.
- Add products to the cart and proceed to checkout.
- Make secure payments using Stripe.
- Leave reviews for purchased products.

## Notes
- Update the Stripe endpoint secret in `app/app.js` whenever a new session is created.
- Refer to the [Stripe documentation](https://stripe.com/docs) and [Cloudinary documentation](https://cloudinary.com/documentation) for additional setup details.

## References
- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [React.js Documentation](https://reactjs.org/)
- [Redux Documentation](https://redux.js.org/)
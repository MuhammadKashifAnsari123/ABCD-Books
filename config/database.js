const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
    this.connect();
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/webscraper';
      
      this.connection = await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      console.log('Connected to MongoDB successfully');
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
      });

      process.on('SIGINT', this.gracefulClose);
      
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      process.exit(1);
    }
  }

  async gracefulClose() {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
      process.exit(1);
    }
  }

  // Get connection status
  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  // Close connection
  async close() {
    if (this.connection) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
}

module.exports = new Database();
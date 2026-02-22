'use strict';

const app = require('./app');
const { PORT } = require('./config/env');

// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
// });
module.exports = app

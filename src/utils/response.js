'use strict';

/**
 * Send a successful JSON response.
 * @param {import('express').Response} res
 * @param {any} data
 * @param {string} [message]
 * @param {number} [statusCode=200]
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send an error JSON response.
 * @param {import('express').Response} res
 * @param {string} code
 * @param {string} message
 * @param {number} [statusCode=400]
 */
const sendError = (res, code, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
};

module.exports = { sendSuccess, sendError };

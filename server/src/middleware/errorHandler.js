const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      message: 'Slot no longer available',
    });
  }

  const status = err.status || 400;
  res.status(status).json({
    message: err.message || 'Internal server error',
  });
};

module.exports = errorHandler;

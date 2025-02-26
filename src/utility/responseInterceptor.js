const responseInterceptor = (req, res, next) => {
  const originalJson = res.json; // Store original res.json function

  res.json = function (data) {

    // Structure the response in a consistent format
    const responseData = {
      status: res.statusCode,
      errors:data?.errors,
      message: data?.message || "Success",
      data: data?.data !== undefined ? data.data : [],
    };


    return originalJson.call(this, responseData); // Call original res.json
  };

  next();
};

module.exports = responseInterceptor;

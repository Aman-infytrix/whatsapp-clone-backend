const errorHandler = (err, req, res, next) => {
    if(process.env.NODE_ENV === 'production'){
        if(!err.isOperational){
        return res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!',
        });
    }
    return res.status(err.httpCode).json({
        status: 'error',
        message: err.message,
    });
    }else{
        return res.status(err.httpCode || 500).json({
            status: 'error',
            message: err.message,
            stackTrace: err.stack,
        });
    }
};

export default errorHandler;
class AppError extends Error{
    constructor(httpCode, message){
        super(message);
        this.httpCode = httpCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
<<<<<<< HEAD
export default function errorHandler(err, req, res, next) {
    console.error("DEBUG ERROR TRACE:", err);
    const status = err.status || 500;
    const message = status === 500 ? 'Internal Server Error' : err.message;
=======
export default function errorHandler(error, req, res, next) {
    console.error("DEBUG ERROR TRACE:", error);
    const status = error.status || 500;
    const message = status === 500 ? 'Internal Server Error' : error.message;
>>>>>>> 953ff5fdede7dbb6782480a08a604c5be3f1ce46

    return res.status(status).json({ success: false, message });
};

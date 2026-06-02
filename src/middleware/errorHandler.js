export default function errorHandler(err, req, res, next) {
    console.error("DEBUG ERROR TRACE:", err);
    const status = err.status || 500;
    const message = status === 500 ? 'Internal Server Error' : err.message;

    return res.status(status).json({ success: false, message });
};

export default function errorHandler(err, req, res, next) {
    console.error("DEBUG ERROR TRACE:", err);
    const status = err.status || (String(err.code || '').startsWith('LIMIT_') ? 400 : 500);
    const message = status === 500 ? 'Internal Server Error' : err.message;

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        response.field = err.field || null;
        response.expectedField = 'file';
    }

    return res.status(status).json(response);
};

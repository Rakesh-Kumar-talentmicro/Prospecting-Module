import multer from 'multer';
import xlsx from 'xlsx';

const storage = multer.memoryStorage();
export const upload = multer({ storage });

export const parseExcelMiddleware = async (req, res, next) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const allProspects = [];
        for (const file of files) {
            const workbook = xlsx.read(file.buffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });
            allProspects.push(...data);
        }

        if (!req.body) req.body = {};
        req.body.prospects = allProspects;
        next();
    } catch (err) {
        console.error("Excel parse error:", err);
        return res.status(500).json({ error: 'Failed to parse excel file' });
    }
};

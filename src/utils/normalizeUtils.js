export const normalizeInputData = (dataList, mapping) => {
    return dataList.map(data => {
        const normalized = {};
        for (let i = 0; i < mapping.length; i++) {
            const [dbKey, frontendKey, dataType] = mapping[i];
            if (data[frontendKey] !== undefined) {
                normalized[dbKey] = castType(data[frontendKey], dataType);
            } else if (data[dbKey] !== undefined) {
                normalized[dbKey] = castType(data[dbKey], dataType);
            }
        }
        return normalized;
    });
};

export const normalizeOutputData = (dataList, mapping) => {
    return dataList.map(data => {
        const normalized = {};
        for (let i = 0; i < mapping.length; i++) {
            const [dbKey, frontendKey, dataType] = mapping[i];
            if (data[dbKey] !== undefined) {
                normalized[frontendKey] = castType(data[dbKey], dataType);
            }
        }
        return normalized;
    });
};

const castType = (value, type) => {
    if (value === null || value === undefined) return null;
    switch (type) {
        case 'number':
            return Number(value);
        case 'string':
            return String(value);
        case 'date':
            return new Date(value);
        default:
            return value;
    }
};

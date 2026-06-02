export const normalizeInputData = (dataList, mapping) => {
    return dataList.map(data => {
        const normalized = {};
        for (let i = 0; i < mapping.length; i++) {
            const [dbKey, frontendKey, dataType] = mapping[i];
            if (data[frontendKey] !== undefined) {
                normalized[dbKey] = castType(data[frontendKey], dataType);
<<<<<<< HEAD
            } else if (data[dbKey] !== undefined) {
                normalized[dbKey] = castType(data[dbKey], dataType);
=======
>>>>>>> 953ff5fdede7dbb6782480a08a604c5be3f1ce46
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
<<<<<<< HEAD

=======
>>>>>>> 953ff5fdede7dbb6782480a08a604c5be3f1ce46

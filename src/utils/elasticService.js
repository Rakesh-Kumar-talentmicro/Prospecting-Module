import client  from '../config/redisClient.js';

const INDEX = 'prospects_index';

// INSERT
export const indexProspect = async (prospect) => {
  try {
    await client.index({
      index: INDEX,
      document: prospect,
      refresh: true
    });
  } catch (err) {
    console.error('ES insert failed:', err.message);
    throw err;
  }
};

// UPDATE
export const updateProspectIndex = async (id, updates) => {
  try {
    await client.update({
      index: INDEX,
      id,
      doc: updates,
      refresh: true
    });
  } catch (err) {
    console.error('ES update failed:', err.message);
    throw err;
  }
};

// DELETE
export const deleteProspectIndex = async (id) => {
  try {
    await client.delete({
      index: INDEX,
      id,
      refresh: true
    });
  } catch (err) {
    console.error('ES delete failed:', err.message);
    throw err;
  }
};

// DUPLICATE CHECK
export const findDuplicate = async (row) => {
  const result = await client.search({
    index: INDEX,
    size: 1,
    query: {
      bool: {
        should: [
          { term: { email: row.email } },
          { term: { phone: row.phone } },
          { term: {website_url: row.website_url} },
          {
            bool: {
              must: [
                { term: { company_name: row.company_name } },
                { term: { city: row.city } },
                { term: { state: row.state } }
              ]
            }
          }
        ],
        minimum_should_match: 1
      }
    }
  });

  if (!result.hits.hits.length) return null;

  return result.hits.hits[0]._source;
};
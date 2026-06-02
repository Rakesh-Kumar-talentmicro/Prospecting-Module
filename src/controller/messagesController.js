import * as messageService from '../service/messagesService.js';
import { CreateError } from '../middleware/createError.js';

export const sendBulk = async (req, res, next) => {
  try {
    const {template_id,messages} = req.body;
    const userId = 105; 
    if (!template_id || !userId) {
      return next(CreateError(400, 'Missing required fields'));
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return next(CreateError(400, 'Messages must be a non-empty array'));
    }
    const result = await messageService.enqueueBulkMessages({ template_id, userId, messages });
    return res.status(201).json({
      success: true,
      message: result.message,
      total_id_inserted: result.queue_ids,
      activity_ids: result.activity_ids
    });
  } catch (err) {
    next(err);
  }
};

export const sendSingle = async (req, res, next) => {
  try {
    const { template_id, prospect_id, payload={} } = req.body;
    //const userId = req.authentication['userid'] || Number(105);  // ----> Authentication part
    const userId = 105;
    if (!template_id || !prospect_id || !userId) {
      return next(CreateError(400, 'Missing required fields'))
    }

    if (typeof payload !== "object" || Array.isArray(payload)) {
      return next(CreateError(400, 'Payload must be a valid JSON object'));
    }

    const result = await messageService.enqueueMessage({ template_id, prospect_id, payload, userId });
    return res.status(201).json({
      success: true,
      message: result.message,
      queue_id: result.queue_id,
      activity_id: result.activity_id
    });

  } catch (error) {
    return next(error);
  }
};

export const sendCustom = async (req, res, next) => {
  try {
    const { channel, prospect_id, subject = null, body } = req.body;
    const userId = 105;

    const result = await messageService.enqueueCustomMessage({
      channel,
      prospect_id,
      subject,
      body,
      userId
    });

    return res.status(201).json({
      success: true,
      message: result.message,
      queue_id: result.queue_id,
      activity_id: result.activity_id
    });
  } catch (err) {
    next(err);
  }
};

export const queue = async (req, res, next) => {
  try {
    let { channel, prospect_id, page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;
    // Channel normalize
    if (channel) {
      if (typeof channel === 'string') channel = channel.split(',');
    }

    if (prospect_id) {
      if (typeof prospect_id === "string") {
        prospect_id = prospect_id.split(",");
      }

      prospect_id = prospect_id.map(id => Number(id));
    }

    const allowedChannels = ['EMAIL', 'SMS', 'WHATSAPP'];
    if (channel) {
      for (const c of channel) {
        if (!allowedChannels.includes(c)) {
          return next(CreateError(400, `Invalid channel: ${c}`));
        }
      }
    }

    // Call service
    const result = await messageService.queue({ channel, prospect_id, limit, offset });

    return res.status(200).json({
      success: true,
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
      data: result.rows,
    });

  } catch (err) {
    next(err);
  }
}

export const postTemplates = async (req, res, next) => {
  try {
    const { templateCode, channel, language_id, subject, body } = req.body;

    if (!templateCode || !channel || !language_id || !subject || !body) {
      return next(CreateError(400, 'Missing required fields'));
    }

    const result = await messageService.postTemplates({ templateCode, channel, language_id, subject, body });

    if (!result) {
      return next(CreateError(400, 'Template with same code, language and channel already exists'));
    }

    return res.status(201).json({ success: true, message: 'Template created successfully' });

  } catch (error) {
    next(CreateError(500, 'Internal Server Error'));
  }
}

export const updateTemplates = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (!id || !data) {
      return next(CreateError(400, 'Missing required fields'));
    }
    const result = await messageService.updateTemplates({id, data});
    if (!result) {
      return next(CreateError(404, 'Template not found'));
    }

    return res.status(200).json({ success: true, message: 'Template updated successfully' });

  } catch (err) {
    next(err);
  }
}

export const getTemplates = async (req, res, next) => {
  try {
    let { templateCode, channel, language_id, page,limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 30;
    const offset = (page - 1) * limit;
    if (channel) {
      if (typeof channel === 'string') channel = channel.split(',');
    }

    const allowedChannels = ['EMAIL', 'SMS', 'WHATSAPP'];
    if (channel) {
      for (const c of channel) {
        if (!allowedChannels.includes(c)) {
          return next(CreateError(400, `Invalid channel: ${c}`));
        }
      }
    }

    const result = await messageService.getTemplates({ templateCode, channel, language_id, limit, offset });
    return res.status(200).json({ success: true, count: result.total, data: result.templates });

  } catch (err) {
    next(err);
  }
}



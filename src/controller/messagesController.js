import * as messageService from '../service/messagesService.js';
import db from '../config/db.js';
import { CreateError } from '../middleware/createError.js';

export const sendBulk = async (req, res, next) => {
  try {
    const {template_id,userId,messages} = req.body;
    if (!template_id || !userId) {
      return next(CreateError(400, 'Missing required fields'));
    }

    // Messages validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return next(CreateError(400, 'Messages must be a non-empty array'));
    }

    // Validate each message item
    for (const item of messages) {
      if (!item.prospect_id) {
        return next(CreateError(400,'prospect_id is required for each message'));
      }

      if (item.payload && typeof item.payload !== 'object') {
        return next(CreateError(400,'payload must be JSON object'));
      }
    }

    const result = await messageService.enqueueBulkMessages({template_id,userId,messages});
    return res.status(201).json({
      success: true,
      message: 'Bulk messages queued successfully',
      data: result
    });

  } catch (error) {
    return next(error);
  }
};
/* 
{
  "template_id": 2,
  "userId": 10,
  "messages": [
    {
      "prospect_id": 101,
      "payload": {
        "meeting_date": "2026-05-02",
        "meeting_link": "https://meet.google.com/a1"
      }
    },
    {
      "prospect_id": 102,
      "payload": {
        "meeting_date": "2026-05-03",
        "meeting_link": "https://meet.google.com/b2"
      }
    },
    {
      "prospect_id": 103
    }
  ]
}
*/

export const sendSingle = async (req, res, next) => {
  try {
    const { template_id, prospect_id, payload, userId } = req.body;

    if (!template_id || !prospect_id || !userId) {
      return next(CreateError(400, 'Missing required fields'))
    }

    // Payload Optional validation
    if (payload && typeof payload !== "object") {
      return next(CreateError(400, 'Payload must be a valid JSON object'))
    }

    // Call service
    const result = await messageService.enqueueMessage({ template_id, prospect_id, payload, userId });
    return res.status(201).json({ success: true, message: "Message queued successfully", data: result });

  } catch (error) {
    return next(error);
  }
};
/* 
{
  "template_id": 2,
  "prospect_id": 101,
  "userId": 10,
  "payload": {
    "meeting_date": "2026-05-02",
    "meeting_link": "https://meet.google.com/abc"
  }
}
*/

export const queue = async (req, res, next) => {
  try {
    let { channel, prospect_id, page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;
    // Default status
    if (status) {
      if (typeof status === "string") {
        status = status.split(",");
      }
    } else {
      // default allow all status if not provided
      status = ['PENDING', 'FAILED'];
    }
    // Channel normalize
    if (channel) {
      if (typeof channel === 'string') channel = channel.split(',');
    }

    if (prospect_id) {
      if (typeof prospect_id === "string") {
        prospect_id = prospect_id.split(",").map(id => parseInt(id));
      }
    }

    // Validation
    const allowedStatus = ['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED'];
    for (let s of status) {
      if (!allowedStatus.includes(s)) {
        return next(CreateError(400, `Invalid status: ${s}`));
      }
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
    const result = await messageService.queue({ status, channel, prospect_id, limit, offset });

    return res.status(200).json({
      success: true,
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
      data: result.rows,
    });

  } catch (err) {
    return next(err);
  }
}
/*
{
  "templateCode": "string (optional)",
  "language_id": "string (optional)",
  "status": "string | comma-separated values (optional)",
  "channel": "string | comma-separated values (optional)",
  "prospect_id": "number (optional)",
  "page": "number (optional, default=1)",
}
 */

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
/*
 API Schemas for create templates:
 {
  "templateCode": "FOLLOW UP",
  "channel": "EMAIL",
  "language_id": "en",
  "subject": "Order Confirmation",
  "body": "Hello {{name}}, your order {{order_id}} is confirmed.",
  "isActive": true,
  "userId": 101
}
*/

export const updateTemplates = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (!id || !data) {
      return next(CreateError(400, 'Missing required fields'));
    }
    const result = await messageService.updateTemplates(id, data);
    if (!result) {
      return next(CreateError(404, 'Template not found'));
    }

    return res.status(200).json({ success: true, message: 'Template updated successfully' });

  } catch (error) {
    next(CreateError(500, 'Internal Server Error'));
  }
}
/*
API for update template:
{
  "templateCode": "FOLLOW UP",
  "channel": "EMAIL",
  "language_id": "en",
  "subject": "Updated Order Confirmation",
  "body": "Hello {{name}}, your order {{order_id}} has been successfully confirmed.",
  "isActive": true,
  "userId": 101
}
*/

export const getTemplates = async (req, res, next) => {
  try {
    let { templateCode, channel, language_id, page } = req.query;
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
    return res.json({ success: true, count: result.total, data: result.templates });

  } catch (err) {
    return next(CreateError(500, 'Internal Server Error'));
  }
}
/*
API for get templates with filters:
/templates?templateCode=FOLLOW%20UP&channel=EMAIL&channel=SMS&channel=WHATSAPP&language_id=en
*/

export const healthCheck = async (req, res,) => {
  const [rows] = await db.query("SELECT * FROM td_messages_queue");
  console.log(rows);
  return res.json({ success: true, message: "API is healthy", data: rows });
}
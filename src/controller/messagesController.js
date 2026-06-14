import * as messageService from "../service/messagesService.js";
import { normalizeInputData, normalizeOutputData} from "../utils/normalizeUtils.js";
import {messageMapping} from "../model/messageModel/messagemapping.js";
import { CreateError } from "../middleware/createError.js";

export const sendBulk = async (req, res, next) => {
  try {
    const requestData = normalizeInputData([req.body], messageMapping)[0];

    const { template_id } = requestData;
    const { messages } = req.body;

    const createdBy = Number(req.headers["user-id"]) || 1;

    if (!template_id) {
      return next(CreateError(400, "templateId is required"));
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return next(CreateError(400, "messages must be a non-empty array"));
    }

    const result = await messageService.enqueueBulkMessages({
      template_id,
      created_by: createdBy,
      messages,
    });

    return res.status(201).json({
      success: true,
      totalMessages: result.totalMessages,
      queueIds: result.queueIds,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

export const sendSingle = async (req, res, next) => {
  try {
    const messageData = normalizeInputData([req.body], messageMapping)[0];
    const { template_id, prospect_id, payload = {} } = messageData;

    const createdBy = Number(req.headers["user-id"]) || 1;

    if (!template_id || !prospect_id) {
      return next(CreateError(400, "templateId and prospectId are required"));
    }

    if (typeof payload !== "object" || Array.isArray(payload)) {
      return next(CreateError(400, "payload must be a valid JSON object"));
    }

    const result = await messageService.enqueueMessage({
      template_id,
      prospect_id,
      payload,
      created_by: createdBy,
    });

    return res.status(201).json({
      success: true,
      queueId: result.queueId,
      message: result.message,
    });
  } catch (err) {
    next(err);
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
      userId,
    });

    return res.status(201).json({
      success: true,
      message: result.message,
      queue_id: result.queue_id,
      activity_id: result.activity_id,
    });
  } catch (err) {
    next(err);
  }
};

export const queue = async (req, res, next) => {
  try {
    const normalizedQuery = normalizeInputData([req.query], messageMapping)[0];
    let { channel, prospect_id, status } = normalizedQuery;
    const limit = parseInt(req.query.limit, 10) || 10;
    const lastId = parseInt(req.query.lastId, 10) || 0;

    if (channel && typeof channel === "string") {
      channel = channel.split(",");
    }

    if (status && typeof status === "string") {
      status = status.split(",").map(Number);
    }

    if (prospect_id) {
      prospect_id = String(req.query.prospectId || req.query.prospect_id)
        .split(",")
        .map(Number);
    }

    const result = await messageService.queue({
      status,
      channel,
      prospect_id,
      limit,
      lastId,
    });

    return res.status(200).json({
      success: true,
      data: normalizeOutputData(result.rows, messageMapping),
      nextLastId: result.nextLastId,
    });
  } catch (err) {
    next(err);
  }
};

export const postTemplates = async (req, res, next) => {
  try {
    const templateData = normalizeInputData([req.body], messageMapping)[0];

    const { template_code, channel, language_id, subject, body } = templateData;

    if (!template_code || !channel || !language_id || !subject || !body) {
      return next(CreateError(400, "Missing required fields"));
    }

    const result = await messageService.postTemplates({
      template_code,
      channel,
      language_id,
      subject,
      body,
    });

    return res.status(201).json({
      success: true,
      templateId: result.insertId,
      message: "Template created successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const updateTemplates = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = normalizeInputData([req.body], messageMapping)[0];

    const result = await messageService.updateTemplates({
      id: Number(id),
      data,
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getTemplates = async (req, res, next) => {
  try {
    const normalizedQuery = normalizeInputData([req.query], messageMapping)[0];

    let { template_code, channel, language_id } = normalizedQuery;

    const limit = parseInt(req.query.limit, 10) || 30;
    const lastId = parseInt(req.query.lastId, 10) || 0;

    if (channel && typeof channel === "string") {
      channel = channel.split(",");
    }

    const result = await messageService.getTemplates({
      template_code,
      channel,
      language_id,
      limit,
      lastId,
    });

    return res.status(200).json({
      success: true,
      data: normalizeOutputData(result.templates, messageMapping),
      nextLastId: result.nextLastId,
    });
  } catch (err) {
    next(err);
  }
};

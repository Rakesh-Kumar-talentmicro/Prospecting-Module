export const prospectMapping = [
    ['id', 'prospectId', 'number'],
    ['company_name', 'companyName', 'string'],
    ['first_name', 'firstName', 'string'],
    ['last_name', 'lastName', 'string'],
    ['job_title', 'jobTitle', 'string'],
    ['email', 'emailAddress', 'string'],
    ['phone', 'phoneNumber', 'string'],
    ['city', 'city', 'string'],
    ['state', 'state', 'string'],
    ['country', 'country', 'string'],
    ['country_iso', 'countryIso', 'number'],
    ['website_url', 'websiteUrl', 'string'],
    ['industry_id', 'industryId', 'number'],
    ['industry_size_id', 'industrySizeId', 'number'],
    ['source_id', 'sourceId', 'number'],

    // IMPORTANT:
    ['referral_name', 'referralName', 'string'],
    ['new_bd_id', 'newBdId', 'number'],
    ['old_bd_id', 'oldBdId', 'number'],
    ['source_bd_id', 'sourceBdId', 'number'],

    ['preferred_lang_id', 'preferredLangId', 'string'],
    ['source_bd_id', 'bdId', 'number'],
    ['stage_code', 'stageCode', 'number'],
    ['prospect_key', 'prospectKey', 'string'],
    ['created_at', 'createdAt', 'date'],
    ['updated_at', 'updatedAt', 'date'],

    // Dashboard Mapping
    ['total_prospects', 'totalProspects', 'number'],
    ['pending', 'pending', 'number'],
    ['attempted', 'attempted', 'number'],
    ['engaged', 'engaged', 'number'],
    ['converted', 'converted', 'number'],
    ['parked', 'parked', 'number']

    // dashboardBDMapping
    ['bd_user_id', 'bdUserId', 'number'],
    ['total_prospects', 'totalProspects', 'number'],
    ['pending', 'pending', 'number'],
    ['attempted', 'attempted', 'number'],
    ['engaged', 'engaged', 'number'],
    ['converted', 'converted', 'number'],
    ['parked', 'parked', 'number'],

    // monthlyCTMapping
    ['month', 'month', 'string'],
    ['converted_count', 'convertedCount', 'number'],

    // bdMonthlyCTMapping
    ['bd_user_id', 'bdUserId', 'number'],
    ['month', 'month', 'string'],
    ['converted_count', 'convertedCount', 'number'],

    // notes
    ['note_id', 'noteId', 'number'],
    ['prospect_id', 'prospectId', 'number'],
    ['note_text', 'noteText', 'string'],
    ['created_by', 'createdBy', 'string'],
    ['attachment_paths', 'attachmentPaths', 'string'],
    ['created_at', 'createdAt', 'date'],

    // bdActivityReportMapping 
    ['period_label', 'periodLabel', 'string'],
    ['bd_id', 'bdId', 'number'],
    ['activities', 'activities', 'number'],
    ['attempted_prospects', 'attemptedProspects', 'number'],
    ['converted_prospects', 'convertedProspects', 'number'],
    ['conversion_percentage', 'conversionPercentage', 'number'],

    // prospectSourcingReportMapping 
    ['period_label', 'periodLabel', 'string'],
    ['bd_id', 'bdId', 'number'],
    ['sourced_prospects', 'sourcedProspects', 'number']
];
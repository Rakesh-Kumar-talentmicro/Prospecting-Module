export const prospectMapping = [
  // Prospect core fields
  ['id', 'prospectId', 'number'],
  ['company_name', 'companyName', 'string'],
  ['first_name', 'firstName', 'string'],
  ['last_name', 'lastName', 'string'],
  ['contact_name', 'contactName', 'string'],
  ['job_title', 'jobTitle', 'string'],
  ['email', 'emailAddress', 'string'],
  ['phone', 'phoneNumber', 'string'],
  ['city', 'city', 'string'],
  ['state', 'state', 'string'],
  ['country', 'country', 'string'],
  ['country_iso', 'countryIso', 'number'],
  ['website_url', 'websiteUrl', 'string'],
  ['linkedin_url', 'linkedinUrl', 'string'],
  ['facebook_url', 'facebookUrl', 'string'],
  ['instagram_url', 'instagramUrl', 'string'],
  ['twitter_url', 'twitterUrl', 'string'],
  ['industry_id', 'industryId', 'number'],
  ['industry_size_id', 'industrySizeId', 'number'],
  ['source_id', 'sourceId', 'number'],
  ['referral_name', 'referralName', 'string'],
  ['notes', 'notes', 'string'],
  ['follow_up_date', 'followUpDate', 'date'],
  ['sourced_date', 'sourcedDate', 'date'],
  ['new_bd_id', 'newBdId', 'number'],
  ['old_bd_id', 'oldBdId', 'number'],
  ['source_bd_id', 'sourceBdId', 'number'],
  ['preferred_lang_id', 'preferredLangId', 'string'],
  ['stage_code', 'stageCode', 'number'],
  ['prospect_key', 'prospectKey', 'string'],
  ['duplicate_count', 'duplicateCount', 'number'],
  ['created_at', 'createdAt', 'date'],
  ['updated_at', 'updatedAt', 'date'],

  // Dashboard Mapping
  ['total_prospects', 'totalProspects', 'number'],
  ['pending', 'pending', 'number'],
  ['attempted', 'attempted', 'number'],
  ['engaged', 'engaged', 'number'],
  ['converted', 'converted', 'number'],
  ['parked', 'parked', 'number'],

  // dashboardBDMapping
  ['bd_user_id', 'bdUserId', 'number'],

  // monthlyCTMapping
  ['month', 'month', 'string'],
  ['converted_count', 'convertedCount', 'number'],

  // Notes
  ['note_id', 'noteId', 'number'],
  ['note_text', 'noteText', 'string'],
  ['created_by', 'createdBy', 'string'],
  ['attachment_paths', 'attachmentPaths', 'string'],

  // bdActivityReportMapping 
  ['period_label', 'periodLabel', 'string'],
  ['bd_id', 'bdId', 'number'],
  ['activities', 'activities', 'number'],
  ['attempted_prospects', 'attemptedProspects', 'number'],
  ['converted_prospects', 'convertedProspects', 'number'],
  ['conversion_percentage', 'conversionPercentage', 'number'],

  // prospectSourcingReportMapping 
  ['sourced_prospects', 'sourcedProspects', 'number']
];

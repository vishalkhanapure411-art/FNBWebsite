export enum SurveyTemplateStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum SurveyQuestionType {
  STAR_RATING = 'STAR_RATING',
  NPS = 'NPS',
  CSAT = 'CSAT',
  TEXT = 'TEXT',
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
}

export enum SurveyStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
}

export enum SurveyChannel {
  QR = 'QR',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  IN_STORE = 'IN_STORE',
}

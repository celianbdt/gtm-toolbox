-- Add new providers to integration_provider enum
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'lemlist';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'instantly';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'smartlead';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'plusvibe';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'clay';

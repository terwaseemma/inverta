-- Installers set their own catalog prices and add an installation fee for
-- labour and materials, so the platform no longer applies a separate uplift.
-- The column also drove a customer-facing "Margin" row on the public
-- calculator, which disclosed each installer's markup to their own customers.
ALTER TABLE "Installer" DROP COLUMN "markupPercent";

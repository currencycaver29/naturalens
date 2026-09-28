NaturaLens data export
======================
Created from Abhay's Cloudflare account for the project handoff.

Contents
- d1/naturalens-waitlist.sql  waitlist + app users (and auth tables)
- d1/naturalens-labels.sql    labeled images, history, training runs
- r2/                         objects from bucket naturalens-data
  Keep these folder names as R2 keys: images/, thumbs/, display/, originals/, runs/

Restore (on the new Cloudflare account)
1. Create empty D1 databases and the R2 bucket (do NOT apply migrations first):
     npx wrangler r2 bucket create naturalens-data
     npx wrangler d1 create naturalens-waitlist
     npx wrangler d1 create naturalens-labels
   Put the new database_id values into apps/web/wrangler.jsonc and apps/labeler/wrangler.jsonc.

2. Import D1:
     npx wrangler d1 execute naturalens-waitlist --remote --file=d1/naturalens-waitlist.sql --yes --config apps/web/wrangler.jsonc
     npx wrangler d1 execute naturalens-labels --remote --file=d1/naturalens-labels.sql --yes --config apps/labeler/wrangler.jsonc

3. Optional: drop ephemeral auth rows (users must request a new OTP; set a new AUTH_PEPPER):
     DELETE FROM otp_challenges;
     DELETE FROM otp_sends;
     DELETE FROM sessions;
     DELETE FROM auth_attempts;

4. Upload R2 (rclone or AWS CLI), preserving relative paths as keys:
     rclone copy ./r2 r2-new:naturalens-data --progress
   or
     aws s3 sync ./r2 s3://naturalens-data --endpoint-url https://<NEW_ACCOUNT_ID>.r2.cloudflarestorage.com

5. Deploy Workers, then confirm Skim shows labeled photos before the old account deletes anything.

Do not copy AUTH_PEPPER, PIN_AUTH_SECRET, or TRAIN_TOKEN from the old account.

Export snapshot
- exported_at: 2026-09-16T06:11:05.872474+00:00
- r2_objects: 3852
- r2_bytes: 1148616628
- d1_waitlist: 14 waitlist rows, 3 users
- d1_labels: 960 images, 2 runs, 4166 label_history rows

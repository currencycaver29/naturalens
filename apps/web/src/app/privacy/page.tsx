import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "../../components/ui/Logo";

export const metadata: Metadata = {
  title: "Privacy Policy | Naturalens",
  description:
    "Privacy Policy for Naturalens, a wildlife species recognition and observation logging app.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-bg text-fg">
      <header className="border-b border-border px-6 py-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo size={28} />
          <Link
            href="/"
            className="text-sm font-medium text-muted transition-colors hover:text-fg"
          >
            Back to home
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-3 font-[family-name:var(--font-archivo)] text-[11px] font-medium uppercase tracking-[0.14em] text-caption">
          Legal
        </p>
        <h1 className="mb-3 font-[family-name:var(--font-outfit)] text-4xl font-light tracking-[-0.025em] md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mb-12 text-sm text-muted">
          Last updated: September 1, 2026
        </p>

        <div className="space-y-10 text-base leading-relaxed text-fg/90">
          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              1. Overview
            </h2>
            <p>
              Naturalens helps you identify wildlife from photos and keep a log
              of what you find. This Privacy Policy explains what information we
              collect, how we use it, and the choices you have. It covers the
              Naturalens website, waitlist, and mobile app.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              2. Information we collect
            </h2>
            <p>Depending on how you use Naturalens, we may collect:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <span className="font-medium">Account details.</span>{" "}
                The email you use to sign in to the mobile app, an optional
                display name, and the time the account was created. We email a
                six-digit sign-in code to that address.
              </li>
              <li>
                <span className="font-medium">Waitlist and contact details.</span>{" "}
                Email address and any related notes you submit when requesting
                early access on the website.
              </li>
              <li>
                <span className="font-medium">Photos and observation data.</span>{" "}
                Images you capture or upload for identification, plus related
                metadata you choose to save, such as species suggestions,
                timestamps, and personal notes in your observation log.
              </li>
              <li>
                <span className="font-medium">Device and usage information.</span>{" "}
                Basic technical data needed to run the app, such as device type,
                OS version, app version, crash logs, and interaction events.
              </li>
              <li>
                <span className="font-medium">Location, if enabled.</span> If you
                allow location access, we may associate approximate or precise
                location with an observation to support your personal log. You
                can deny or revoke this permission in system settings.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              3. How we use information
            </h2>
            <p>We use information to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Provide species identification and show results in the app</li>
              <li>Store and display your personal observation history</li>
              <li>Operate sign-in, the early-access waitlist, and related product emails</li>
              <li>Debug issues, improve accuracy, and develop new features</li>
              <li>Protect the service against abuse and technical failures</li>
            </ul>
            <p>
              We do not sell your personal information. We do not use your
              wildlife photos for advertising.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              4. AI processing and third parties
            </h2>
            <p>
              Identification currently runs in the cloud using third-party AI
              providers. When you request an identification, your photo and
              related request data may be transmitted to those providers solely
              to generate a species suggestion.
            </p>
            <p>
              We may also use infrastructure providers for hosting, storage,
              analytics, crash reporting, or email delivery (including sending
              one-time sign-in codes). Those providers process data on our
              behalf under contractual obligations where applicable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              5. Local storage on your device
            </h2>
            <p>
              Some observation data, thumbnails, or preferences may be stored
              locally on your device so the app works offline or between
              sessions. Clearing app data or uninstalling the app may delete
              that local information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              6. Retention
            </h2>
            <p>
              We keep account emails, display names, and waitlist records while
              the product is active and as needed for sign-in, product
              communications, or legal requirements. Photos and identification
              requests processed in the cloud are retained only as long as
              needed to provide the result and operate the service, unless a
              longer period is required for security, debugging, or law. You can
              delete local observations from the app where that control is
              available.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              7. Sharing
            </h2>
            <p>We share information only when needed to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Run identification and core product infrastructure</li>
              <li>Comply with law, lawful requests, or legal process</li>
              <li>Protect users, wildlife, or Naturalens from harm or abuse</li>
              <li>
                Complete a business transfer such as a merger or acquisition, in
                which case this Policy will continue to apply or you will be
                notified of changes
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              8. Your choices
            </h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>Decline camera, photo library, or location permissions</li>
              <li>Choose which photos to submit for identification</li>
              <li>Delete observations stored in the app where supported</li>
              <li>Change or clear your display name in the app</li>
              <li>
                Sign out, or request deletion of your account email by contacting
                us with the address you used to sign in
              </li>
              <li>
                Request removal from the waitlist by contacting us with the email
                you used to sign up
              </li>
            </ul>
            <p>
              Depending on where you live, you may also have rights to access,
              correct, delete, or export personal information, or to object to
              certain processing. Contact us to make a request.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              9. Children
            </h2>
            <p>
              Naturalens is not directed to children under 13 (or the minimum
              age required in your jurisdiction). We do not knowingly collect
              personal information from children. If you believe a child has
              provided information to us, contact us and we will take
              appropriate steps to delete it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              10. Security
            </h2>
            <p>
              We use reasonable technical and organizational measures to protect
              information in transit and at rest. No method of transmission or
              storage is completely secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              11. International transfers
            </h2>
            <p>
              Naturalens and its providers may process information in countries
              other than your own. Those countries may have different data
              protection laws. Where required, we use appropriate safeguards for
              such transfers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              12. Changes
            </h2>
            <p>
              We may update this Privacy Policy as the product evolves. The
              &quot;Last updated&quot; date will change when we do. Continued use
              after an update means you acknowledge the revised Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              13. Contact
            </h2>
            <p>
              Privacy questions or requests can be sent through the contact
              channels listed on the Naturalens website or in the app. Related
              terms are described in our{" "}
              <Link href="/terms" className="underline underline-offset-2 hover:text-fg">
                Terms of Service
              </Link>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}

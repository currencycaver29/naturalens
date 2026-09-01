import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "../../components/ui/Logo";

export const metadata: Metadata = {
  title: "Terms of Service | Naturalens",
  description:
    "Terms of Service for Naturalens, a wildlife species recognition and observation logging app.",
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mb-12 text-sm text-muted">
          Last updated: September 1, 2026
        </p>

        <div className="space-y-10 text-base leading-relaxed text-fg/90">
          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              1. The service
            </h2>
            <p>
              Naturalens is a wildlife recognition product. You can capture or
              upload a photo of an animal, receive a suggested species
              identification, and keep a personal log of observations. The
              website may also offer an early-access waitlist for product
              updates and invites.
            </p>
            <p>
              Identification currently runs in the cloud using third-party AI
              services. Features, accuracy, and availability may change as we
              improve the product.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              2. Acceptance
            </h2>
            <p>
              By accessing the Naturalens website or using the Naturalens app,
              you agree to these Terms. If you do not agree, do not use the
              service. If you use Naturalens on behalf of an organization, you
              represent that you have authority to bind that organization.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              3. Eligibility and accounts
            </h2>
            <p>
              You must be able to form a binding contract in your jurisdiction
              to use Naturalens. The mobile app requires an email address to
              sign in. You are responsible for access to that address and for
              activity under the resulting session.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              4. Early access and waitlist
            </h2>
            <p>
              The mobile app signs you in by emailing a one-time six-digit code
              to the address you provide. Early-access builds may be incomplete,
              unstable, or withdrawn at any time. Joining the website waitlist
              does not guarantee access, timing, or features. We may contact you
              at the email you provide about access, product updates, or related
              notices.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              5. Photos, observations, and AI identification
            </h2>
            <p>
              When you submit a photo for identification, Naturalens processes
              that image to suggest a species and related information. You
              retain ownership of your photos and observation notes. You grant
              Naturalens a limited license to process, store, and transmit that
              content only as needed to provide and improve the service.
            </p>
            <p>
              Species suggestions are probabilistic and may be wrong. Naturalens
              is for curiosity, education, and personal logging. It is not a
              substitute for expert field identification, wildlife management
              advice, veterinary care, or legal guidance about protected
              species.
            </p>
            <p>
              Do not use Naturalens to harm wildlife, violate wildlife laws, or
              approach animals unsafely. Keep a respectful distance and follow
              local rules and park guidelines.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              6. Acceptable use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Upload content you do not have the right to use</li>
              <li>
                Upload illegal, abusive, or intentionally deceptive content
              </li>
              <li>
                Attempt to reverse engineer, overload, scrape, or disrupt the
                service
              </li>
              <li>
                Use identification results to harass people, trespass, or break
                the law
              </li>
              <li>
                Misrepresent Naturalens output as definitive scientific or legal
                authority
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              7. Third-party services
            </h2>
            <p>
              Naturalens may rely on third-party providers for AI inference,
              hosting, analytics, or communications. Their terms and privacy
              practices may apply to content processed through those services.
              We are not responsible for outages or changes outside our control.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              8. Intellectual property
            </h2>
            <p>
              The Naturalens name, branding, software, and site content are
              owned by Naturalens or its licensors. These Terms do not transfer
              ownership of that material to you. Feedback you send may be used
              to improve the product without obligation to you.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              9. Disclaimers
            </h2>
            <p>
              Naturalens is provided &quot;as is&quot; and &quot;as
              available.&quot; To the fullest extent permitted by law, we
              disclaim warranties of merchantability, fitness for a particular
              purpose, accuracy of species identification, and non-infringement.
              We do not warrant uninterrupted or error-free operation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              10. Limitation of liability
            </h2>
            <p>
              To the fullest extent permitted by law, Naturalens and its
              contributors are not liable for indirect, incidental, special,
              consequential, or punitive damages, or for lost data, lost
              profits, or decisions made based on identification results. Our
              total liability for any claim relating to the service is limited
              to the greater of (a) the amount you paid us for the service in
              the 12 months before the claim, or (b) USD $50.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              11. Termination
            </h2>
            <p>
              You may stop using Naturalens at any time. We may suspend or end
              access if you violate these Terms, misuse the service, or if we
              discontinue the product. Provisions that should survive
              termination, including ownership, disclaimers, and liability
              limits, will survive.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              12. Changes
            </h2>
            <p>
              We may update these Terms as Naturalens evolves. The &quot;Last
              updated&quot; date will change when we do. Continued use after
              updates means you accept the revised Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-normal tracking-tight text-fg">
              13. Contact
            </h2>
            <p>
              Questions about these Terms can be sent through the contact
              channels listed on the Naturalens website or in the app.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}

import Link from "next/link";
export const metadata = { title: "Privacy" };
export default function Privacy() {
  return (
    <article className="prose">
      <Link href="/" className="back-link">
        ← Back to exploring
      </Link>
      <h1>Your privacy, after hours.</h1>
      <p>
        HungryOwl uses only the information needed to help you discover and contribute late-night
        food listings.
      </p>
      <h2>Your account</h2>
      <p>
        We store your name, email address, verification status, and account sessions. Google sign-in
        shares your basic account information. HungryOwl does not ask for your Google password. Your
        email is not shown on public stall listings.
      </p>
      <h2>Your location</h2>
      <p>
        Browsing coordinates are sent to our server to calculate nearby distances. They are not
        saved as travel history. Your search radius is saved on this device. When you submit or
        relocate a stall, that stall’s GPS coordinates become part of its listing and are visible to
        other users. After you allow location access, your browser also sends its current
        coordinates directly to BigDataCloud to find the area name shown in navigation. That service
        receives your IP address with the request and uses location signals to improve its
        geolocation data. We do not perform an IP-based lookup when you deny location access.
      </p>
      <h2>Photos and owner contacts</h2>
      <p>
        Stall photos become visible with approved listings. We remove embedded location metadata
        when processing photos. An owner’s contact number is accessible to the admin team for
        ownership verification and is not displayed publicly.
      </p>
      <h2>Contributions and moderation</h2>
      <p>
        We store your stall submissions, ratings, closure reports, and relevant moderation activity.
        Administrators review new stalls and closure reports. Verified owners can update their
        listings.
      </p>
      <h2>Service providers</h2>
      <p>
        The application runs on the operator’s server and stores structured data in Neon PostgreSQL.
        Google sign-in and directions share the information needed for those services with Google.
        Location naming uses BigDataCloud, subject to its{" "}
        <a href="https://www.bigdatacloud.com/privacy">privacy policy</a>. No advertising trackers
        are included.
      </p>
      <h2>Cookies and retention</h2>
      <p>
        Essential cookies keep you signed in. Sessions expire after seven days unless renewed
        through activity. Stall contributions and audit records remain while needed to operate and
        moderate the service. Server administrators must configure log retention and a contact
        address before public launch.
      </p>
      <h2>Your choices</h2>
      <p>
        You can revoke location permission in your browser, sign out, and clear this site’s stored
        search radius. Contact the service operator to request account information or removal.
        Operator contact information will be provided before public launch.
      </p>
    </article>
  );
}

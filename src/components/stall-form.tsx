"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LocateFixed,
  MapPin,
  Plus,
  Trash2,
  Store,
  CheckCircle2,
} from "lucide-react";
import { DIETS, DIET_LABELS, MAX_PHOTO_BYTES, type Diet, type StallDetails } from "@/lib/config";
import { stallCreateSchema, stallUpdateSchema } from "@/lib/validation";
import { useLocation } from "@/hooks/use-location";
import { mutate, errorMessage } from "@/lib/client-api";
import { CameraPhotoInput } from "@/components/camera-photo-input";
type EditableMenu = { name: string; price: string; diet: Diet };
export function StallForm({ stall, demo, backHref = "/owner" }: { stall?: StallDetails; demo: boolean; backHref?: "/owner" | "/admin" }) {
  const editing = !!stall,
    router = useRouter(),
    location = useLocation();
  const [name, setName] = useState(stall?.name || ""),
    [description, setDescription] = useState(stall?.description || ""),
    [area, setArea] = useState(stall?.area || ""),
    [relationship, setRelationship] = useState<"mine" | "other">("other"),
    [contactPhone, setContactPhone] = useState(stall?.submission?.contactPhone || "");
  const [diets, setDiets] = useState<Diet[]>(stall?.diets || ["veg"]),
    [opensAt, setOpensAt] = useState(stall?.opensAt || "23:00"),
    [closesAt, setClosesAt] = useState(stall?.closesAt || "06:00");
  const [menu, setMenu] = useState<EditableMenu[]>(
    stall?.menu.map((m) => ({ ...m, price: m.price === null ? "" : String(m.price) })) || [],
  );
  const [files, setFiles] = useState<(File | null)[]>([null, null]);
  const [photoIds, setPhotoIds] = useState<(string | null)[]>(
    stall?.photos.map((p) => p.split("/").pop()!) || [null, null],
  );
  const [changeLocation, setChangeLocation] = useState(false),
    [closure, setClosure] = useState("keep");
  const [reopensAt, setReopensAt] = useState("");
  const [busy, setBusy] = useState(false),
    [stage, setStage] = useState(""),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const [createdId, setCreatedId] = useState("");
  function selectPhoto(index: number, file: File) {
    if (
      file.size > MAX_PHOTO_BYTES ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setError("Use a JPG, PNG or WebP under 4 MB.");
      return;
    }
    setFiles((previous) => previous.map((item, i) => (i === index ? file : item)));
    setPhotoIds((previous) => previous.map((item, i) => (i === index ? null : item)));
    setError("");
  }
  function updateMenu(index: number, patch: Partial<EditableMenu>) {
    setMenu((previous) => previous.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (demo) {
      setError("This preview does not create real stall listings.");
      return;
    }
    const coords = location.coordinates;
    if ((!editing || changeLocation) && !coords) {
      setError("Capture your current location while standing at the stall.");
      return;
    }
    if (photoIds.some((id, i) => !id && !files[i])) {
      setError("Please take both stall photos using the camera.");
      return;
    }
    const base = {
      name,
      description,
      area,
      diets,
      opensAt,
      closesAt,
      menu: menu.map((item) => ({
        ...item,
        price: item.price.trim() === "" ? null : Number(item.price),
      })),
    };
    const captured = coords
      ? {
          latitude: coords.latitude,
          longitude: coords.longitude,
          locationCapturedAt: coords.capturedAt,
          accuracy: coords.accuracy,
        }
      : {};
    const customReopening = closure === "custom" ? new Date(`${reopensAt}:00+05:30`) : null;
    if (closure === "custom" && (!reopensAt || !customReopening || Number.isNaN(customReopening.getTime()))) {
      setError("Choose a reopening date and time in Bangalore time.");
      return;
    }
    const payload = editing
      ? {
          ...base,
          contactPhone,
          closedUntil:
            closure === "keep"
              ? stall.closedUntil && new Date(stall.closedUntil).getTime() > Date.now()
                ? stall.closedUntil
                : null
              : closure === "open"
                ? null
                : closure === "custom"
                  ? customReopening!.toISOString()
                : new Date(Date.now() + Number(closure) * 3600000).toISOString(),
          ...(changeLocation ? { location: captured } : {}),
        }
      : {
          ...base,
          ...captured,
          relationship,
          contactPhone,
          photoIds: [
            "00000000-0000-4000-8000-000000000001",
            "00000000-0000-4000-8000-000000000002",
          ],
        };
    const validation = (editing ? stallUpdateSchema : stallCreateSchema).safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const uploaded = [...photoIds];
      for (let i = 0; i < 2; i++) {
        if (uploaded[i]) continue;
        setStage(`Uploading photo ${i + 1} of 2…`);
        const form = new FormData();
        form.set("photo", files[i]!);
        const response = await fetch("/api/uploads", { method: "POST", body: form });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Photo upload failed.");
        uploaded[i] = body.id;
        setPhotoIds([...uploaded]);
      }
      setStage(editing ? "Saving your changes…" : "Sending for review…");
      const result = await mutate<{ id: string }>(
        editing ? `/api/stalls/${stall.id}` : "/api/stalls",
        { ...payload, photoIds: uploaded },
        editing ? "PATCH" : "POST",
      );
      setCreatedId(result.id);
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      setStage("");
    }
  }
  if (done)
    return (
      <div className="empty-state">
        <CheckCircle2 size={40} />
        <h2>{editing ? "Your stall is up to date." : "A new find for the night crew."}</h2>
        <p>
          {editing
            ? "Your changes are now saved. Opening hours and temporary closures update the nearby list automatically."
            : relationship === "mine"
              ? "Your stall has been submitted for admin review. You can already manage its menu, timings and details in My stalls."
              : "The stall has been submitted for admin review. You can track it in My stalls until an owner is assigned; it then moves to their My stalls section."}
        </p>
        <Link href={editing ? `/stalls/${createdId}` : "/owner"} className="button primary">
          {editing ? "View your stall" : "View my submissions"}
        </Link>
      </div>
    );
  return (
    <div className="narrow-page">
      <Link href={editing ? backHref : "/"} className="back-link">
        <ArrowLeft size={15} />
        {editing ? backHref === "/admin" ? "Back to admin review" : "My stalls" : "Back to exploring"}
      </Link>
      <div className="page-heading">
        <div className="eyebrow">
          <Store size={15} />
          {editing ? "YOUR STALL, YOUR DETAILS" : "GOOD FINDS ARE BETTER SHARED"}
        </div>
        <h1>{editing ? "Keep the night crew in the know." : "Put a little stall on the map."}</h1>
        <p>
          {editing
            ? "Update the menu, opening hours, photos and temporary closures. Pending listings appear nearby after admin approval."
            : "Found a place that’s still cooking after hours? Help another hungry owl find it."}
        </p>
      </div>
      {demo && (
        <div className="notice">
          Sample preview · You can explore this form. Submissions become available after live
          sign-in is connected.
        </div>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <section className="panel">
            <h2>01 · The basics</h2>
            <p>A name to remember and a little about what’s cooking.</p>
            {!editing && (
              <div className="field">
                <span>Whose stall is it?</span>
                <div className="choice-row">
                  <label className="choice-card">
                    <input
                      type="radio"
                      name="relationship"
                      checked={relationship === "mine"}
                      onChange={() => setRelationship("mine")}
                    />
                    My stall
                  </label>
                  <label className="choice-card">
                    <input
                      type="radio"
                      name="relationship"
                      checked={relationship === "other"}
                      onChange={() => setRelationship("other")}
                    />
                    Someone else’s stall
                  </label>
                </div>
                <small>Choose “My stall” to manage it immediately. Our admin team reviews every new listing.</small>
              </div>
            )}
            <label className="field">
              Stall name
              <input
                required
                minLength={3}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What’s the stall called?"
              />
            </label>
            <label className="field">
              A little about the stall
              <textarea
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="The special dosa, the chai worth stopping for…"
              />
            </label>
            <div className="field">
              <span>What’s on offer?</span>
              <div className="choice-row">
                {DIETS.map((diet) => (
                  <label key={diet} className="choice-card">
                    <input
                      type="checkbox"
                      checked={diets.includes(diet)}
                      onChange={(e) =>
                        setDiets(
                          e.target.checked ? [...diets, diet] : diets.filter((d) => d !== diet),
                        )
                      }
                    />
                    {DIET_LABELS[diet]}
                  </label>
                ))}
              </div>
            </div>
              <label className="field">
                Owner’s contact number
                <input
                  type="tel"
                  autoComplete="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value.replace(/[\s-]/g, ""))}
                  placeholder="10-digit Indian mobile number"
                />
                <small>
                  This number is visible to you, the assigned owner and the admin team for verification.
                </small>
              </label>
          </section>
          <section className="panel">
            <h2>02 · The spot</h2>
            <p>
              Stand at the stall and capture your current location. The map pin cannot be moved
              manually.
            </p>
            <label className="field">
              Neighbourhood / landmark
              <input
                required
                maxLength={100}
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Koramangala, near the petrol bunk"
              />
              <small>This label doesn’t change the GPS location.</small>
            </label>
            {editing && (
              <label className="choice-card">
                <input
                  type="checkbox"
                  checked={changeLocation}
                  onChange={(e) => setChangeLocation(e.target.checked)}
                />
                Update the stall’s location using my current GPS position
              </label>
            )}
            {(!editing || changeLocation) && (
              <>
                <div className="location-box">
                  <MapPin size={25} />
                  <div>
                    <strong>
                      {location.coordinates
                        ? "Current location captured"
                        : "Be there. Pin it here."}
                    </strong>
                    <p>
                      {location.coordinates
                        ? `${location.coordinates.latitude.toFixed(5)}, ${location.coordinates.longitude.toFixed(5)} · ±${Math.round(location.coordinates.accuracy)} m accuracy`
                        : "Capture a fresh location within 10 minutes of submitting."}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={location.request}
                    disabled={location.loading}
                  >
                    <LocateFixed size={15} />
                    {location.loading
                      ? "Locating…"
                      : location.coordinates
                        ? "Refresh GPS"
                        : "Use current location"}
                  </button>
                </div>
                {location.error && (
                  <div className="notice error" role="alert">
                    {location.error}. Allow location access in your browser and try again.
                  </div>
                )}
              </>
            )}
          </section>
          <section className="panel">
            <h2>03 · The late hours</h2>
            <p>
              Use Bangalore time. Hours must overlap 11 pm–6 am; an earlier closing time means the
              next morning.
            </p>
            <div className="field-row">
              <label className="field">
                Opens at
                <input
                  type="time"
                  required
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                />
              </label>
              <label className="field">
                Closes at
                <input
                  type="time"
                  required
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                />
              </label>
            </div>
            {editing && (
              <label className="field">
                Temporary closure
                <select value={closure} onChange={(e) => setClosure(e.target.value)}>
                  <option value="keep">Keep current status</option>
                  <option value="open">Resume normal opening hours</option>
                  <option value="3">Closed for the next 3 hours</option>
                  <option value="12">Closed for the next 12 hours</option>
                  <option value="24">Closed for the next 24 hours</option>
                  <option value="168">Closed for the next 7 days</option>
                  <option value="custom">Choose reopening date & time</option>
                </select>
                <small>
                  After a temporary closure ends, your normal hours resume automatically.
                </small>
              </label>
            )}
            {editing && closure === "custom" && <label className="field">
              Reopens on (Bangalore time)
              <input type="datetime-local" required value={reopensAt} onChange={(e) => setReopensAt(e.target.value)} />
              <small>Choose a time within 90 days. Your daily schedule applies after this closure ends.</small>
            </label>}
          </section>
          <section className="panel">
            <h2>04 · Two photos, the full picture</h2>
            <p>
              Tap each box to take a fresh photo: the stall and a second angle. Avoid faces and private information.
            </p>
            <div className="photo-grid">
              {[0, 1].map((i) => (
                <CameraPhotoInput
                  key={i}
                  index={i}
                  file={files[i]}
                  existing={stall?.photos[i]}
                  onChange={(file) => selectPhoto(i, file)}
                />
              ))}
            </div>
            <small className="muted">
              Exactly 2 photos · At least 200 × 200 pixels · Location metadata is removed.
            </small>
          </section>
          <section className="panel">
            <h2>05 · On the menu</h2>
            <p>Add what you know. Leave the price blank if it isn’t mentioned.</p>
            {menu.map((item, i) => (
              <div key={i} className="menu-edit-row">
                <input
                  required
                  maxLength={100}
                  aria-label={`Menu item ${i + 1} name`}
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => updateMenu(i, { name: e.target.value })}
                />
                <input
                  type="number"
                  min={0}
                  max={100000}
                  step="0.01"
                  aria-label={`Menu item ${i + 1} price in rupees`}
                  placeholder="₹ Price"
                  value={item.price}
                  onChange={(e) => updateMenu(i, { price: e.target.value })}
                />
                <select
                  aria-label={`Menu item ${i + 1} diet`}
                  value={item.diet}
                  onChange={(e) => updateMenu(i, { diet: e.target.value as Diet })}
                >
                  {DIETS.map((d) => (
                    <option key={d} value={d}>
                      {DIET_LABELS[d]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove menu item ${i + 1}`}
                  onClick={() => setMenu(menu.filter((_, index) => index !== i))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button secondary small"
              disabled={menu.length >= 100}
              onClick={() => setMenu([...menu, { name: "", price: "", diet: "veg" }])}
            >
              <Plus size={16} /> Add menu item
            </button>
          </section>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <div className="form-actions">
            <p>
              {editing
                ? stall.status === "approved" ? "Your changes go live immediately." : "Your changes are saved for admin review."
                : "Every new listing is reviewed before it appears."}
            </p>
            <button className="button primary" disabled={demo || busy} type="submit">
              {busy ? stage || "Saving…" : editing ? "Save changes" : "Submit for review"}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}

import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { GlassCard, SectionTitle } from "@/components/ui/GlassCard";
import { demoUserData } from "@/lib/finance/demo-profile";
import {
  createProfile,
  deleteProfile,
  getActiveProfile,
  listProfiles,
  resetProfileData,
  switchProfile,
  type ProfileInfo,
} from "@/lib/finance/user-data";
import { useUserData } from "@/hooks/useFinance";

export const Route = createFileRoute("/perfiles")({
  head: () => ({
    meta: [
      { title: "Perfiles y reinicio — OK cash" },
      {
        name: "description",
        content:
          "Crea perfiles independientes para presentar o probar OK cash, cambia entre ellos y reinicia los datos de uno sin afectar a los demás.",
      },
      { property: "og:title", content: "Perfiles y reinicio — OK cash" },
      {
        property: "og:description",
        content: "Cada perfil guarda su propio dinero, pagos, ingresos, reserva y metas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilesPage,
});

function ProfilesPage() {
  const router = useRouter();
  // Fuerza un re-render cuando cambian los datos del perfil activo.
  useUserData();
  const [newName, setNewName] = useState("");
  const [tick, setTick] = useState(0);

  const profiles: ProfileInfo[] = typeof window === "undefined" ? [] : listProfiles();
  const active = typeof window === "undefined" ? null : getActiveProfile();
  const refresh = () => setTick(tick + 1);

  const goHome = () => {
    refresh();
    router.navigate({ to: "/" });
  };

  return (
    <div className="relative min-h-screen px-5 py-10 text-ink">
      <div className="pointer-events-none absolute -left-24 -top-24 size-[420px] rounded-full bg-accent/25 blur-3xl" />
      <div className="relative mx-auto w-full max-w-2xl">
        <div className="font-display text-2xl font-bold tracking-tight">
          OK<span className="text-brand"> cash</span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Perfiles</h1>
        <p className="mt-2 text-sm leading-relaxed text-inksoft">
          Cada perfil guarda su propio dinero, ingresos, pagos, reserva y metas. Sirve para presentar OK cash con
          un escenario limpio y, aparte, hacer pruebas sin mezclar nada. No hay contraseñas ni datos bancarios.
        </p>

        <GlassCard className="mt-6">
          <SectionTitle title="Tus perfiles" />
          <div className="mt-4 space-y-3">
            {profiles.length === 0 ? (
              <p className="text-[12px] text-inksoft">Todavía no hay perfiles. Crea el primero abajo.</p>
            ) : null}
            {profiles.map((profile) => {
              const isActive = active?.id === profile.id;
              return (
                <div
                  key={profile.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl glass-soft p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className="truncate">{profile.name}</span>
                      {profile.kind === "demo" ? (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-brand">
                          demo
                        </span>
                      ) : null}
                      {isActive ? (
                        <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand">
                          en uso
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-inksoft">Datos guardados solo en este dispositivo</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!isActive ? (
                      <button
                        type="button"
                        onClick={() => {
                          switchProfile(profile.id);
                          goHome();
                        }}
                        className="rounded-xl gradient-brand px-3 py-2 text-xs font-semibold text-white"
                      >
                        Usar
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        resetProfileData(profile.id);
                        refresh();
                      }}
                      className="rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-xs font-semibold text-ink"
                    >
                      Reiniciar datos
                    </button>
                    {profiles.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          deleteProfile(profile.id);
                          refresh();
                        }}
                        className="rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-xs font-semibold text-rose"
                      >
                        Eliminar
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="mt-4">
          <SectionTitle title="Crear un perfil" />
          <div className="mt-4 space-y-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del perfil (por ejemplo: Pruebas)"
              className="w-full rounded-xl border border-white/70 bg-white/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/40"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  createProfile(newName || "Nuevo perfil");
                  setNewName("");
                  router.navigate({ to: "/configuracion" });
                }}
                className="rounded-xl gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-brand-glow"
              >
                Crear y capturar datos
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = newName || "Perfil demo";
                  createProfile(name, { kind: "demo", data: demoUserData(name) });
                  setNewName("");
                  goHome();
                }}
                className="rounded-xl border border-white/70 bg-white/60 px-4 py-2.5 text-sm font-semibold text-ink"
              >
                Crear perfil de demostración
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-inksoft">
              El perfil de demostración se crea con un escenario de ejemplo listo para presentar. El otro perfil
              empieza vacío para que captures tus propios datos.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

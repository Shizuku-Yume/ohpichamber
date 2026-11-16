import React from 'react';
import { Icon } from '@/components/icon/Icon';
import { SETTINGS_SECTION_TITLE_CLASS, SettingsSection } from '@/components/sections/shared/SettingsSection';
import { fetchReleaseNotes, formatReleaseDate, type ReleaseNotesRelease } from '@/components/update/releaseNotes';
import { ReleaseNotesBody } from '@/components/update/ReleaseNotesBody';
import { useI18n } from '@/lib/i18n';

const GITHUB_RELEASES_URL = 'https://github.com/openchamber/openchamber/releases';

/**
 * What the installed version brought, read from the changelog bundled with
 * the app. Nothing shows while the notes load, when the bundle cannot be
 * read, or when the changelog has none for this version.
 */
export const AboutReleaseNotes: React.FC<{ version: string | null }> = ({ version }) => {
  const { t } = useI18n();
  const [releases, setReleases] = React.useState<ReleaseNotesRelease[] | null>(null);

  React.useEffect(() => {
    if (!version) return;
    const controller = new AbortController();
    void fetchReleaseNotes(version, null, controller.signal).then((loaded) => {
      if (!controller.signal.aborted) setReleases(loaded);
    });
    return () => controller.abort();
  }, [version]);

  if (!releases || releases.length === 0) return null;

  const single = releases.length === 1 ? releases[0] : null;
  return (
    <SettingsSection
      title={(
        <h2 className={SETTINGS_SECTION_TITLE_CLASS}>
          {t('settings.openchamber.about.releaseNotes.current', { version: version ?? '' })}
          {single && <span className="typography-meta whitespace-nowrap text-muted-foreground"> · {formatReleaseDate(single.date)}</span>}
        </h2>
      )}
      headerAction={(
        <a
          href={GITHUB_RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 typography-meta text-muted-foreground transition-colors hover:text-foreground"
        >
          {t('settings.openchamber.about.releaseNotes.allReleases')}
          <Icon name="external-link" className="size-3.5" />
        </a>
      )}
      contentClassName="space-y-2"
    >
      {releases.map((release) => (
        <div key={release.version} className="oc-tile rounded-lg p-4">
          <ReleaseNotesBody notes={release} folded={false} />
        </div>
      ))}
    </SettingsSection>
  );
};

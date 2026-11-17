import React from 'react';
import { ModelSelector } from '@/components/sections/agents/ModelSelector';
import {
  SETTINGS_CUSTOM_TRIGGER_CLASS,
  SETTINGS_SELECT_TRIGGER_CLASS,
  SettingsStackedField,
} from '@/components/sections/shared/SettingsSection';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n';
import type { RoutingCategory } from '@/lib/routing/routingApi';
import { cn } from '@/lib/utils';
import { VariantSelect } from './VariantSelect';
import {
  hasCategoryNameCollision,
  knownVariant,
  useModelReasoningEfforts,
} from './routingCategoryUtils';

export interface CreateRoutingCategoryInput {
  name: string;
  description: string;
  model: { providerID: string; modelID: string } | null;
  variant: string | null;
}

interface CreateRoutingCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCategories: ReadonlyArray<Pick<RoutingCategory, 'id' | 'name'>>;
  onCreate: (input: CreateRoutingCategoryInput) => void;
}

export const CreateRoutingCategoryDialog: React.FC<CreateRoutingCategoryDialogProps> = ({
  open,
  onOpenChange,
  existingCategories,
  onCreate,
}) => {
  const { t } = useI18n();
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [model, setModel] = React.useState<{ providerID: string; modelID: string } | null>(null);
  const [variant, setVariant] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const errorId = React.useId();
  const nameErrorId = `${errorId}-name`;
  const descriptionErrorId = `${errorId}-description`;

  const efforts = useModelReasoningEfforts(model?.providerID, model?.modelID);

  React.useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setModel(null);
    setVariant(null);
    setSubmitted(false);
  }, [open]);

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();

  const computeNameError = (): string | null => {
    if (trimmedName.length === 0) return t('settings.routing.category.nameRequired');
    if (hasCategoryNameCollision(trimmedName, existingCategories)) {
      return t('settings.routing.category.nameDuplicate');
    }
    return null;
  };

  const computeDescriptionError = (): string | null => {
    if (trimmedDescription.length === 0) return t('settings.routing.category.descriptionRequired');
    return null;
  };

  const nameError = submitted ? computeNameError() : null;
  const descriptionError = submitted ? computeDescriptionError() : null;

  const handleSubmit = () => {
    setSubmitted(true);
    const nextNameError = computeNameError();
    const nextDescriptionError = computeDescriptionError();
    if (nextNameError) {
      nameInputRef.current?.focus();
      return;
    }
    if (nextDescriptionError) {
      descriptionTextareaRef.current?.focus();
      return;
    }
    onCreate({
      name: trimmedName,
      description: trimmedDescription,
      model,
      variant: knownVariant(variant, efforts),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('settings.routing.categories.createDialog.title')}</DialogTitle>
          <DialogDescription>{t('settings.routing.categories.createDialog.description')}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
          className="flex flex-col gap-5"
        >
          <SettingsStackedField
            label={t('settings.routing.category.name')}
            controlClassName="w-full max-w-none"
          >
            <div className="w-full">
              <Input
                ref={nameInputRef}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('settings.routing.category.namePlaceholder')}
                aria-label={t('settings.routing.category.name')}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? nameErrorId : undefined}
                maxLength={60}
                className="w-full"
              />
              {nameError ? (
                <p id={nameErrorId} className="mt-1 typography-meta text-[var(--status-error)]">
                  {nameError}
                </p>
              ) : null}
            </div>
          </SettingsStackedField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SettingsStackedField
              label={t('settings.routing.category.model')}
              info={t('settings.routing.category.modelInfo')}
              controlClassName="w-full max-w-none"
            >
              <ModelSelector
                providerId={model?.providerID ?? ''}
                modelId={model?.modelID ?? ''}
                onChange={(providerID, modelID) => {
                  setModel(providerID && modelID ? { providerID, modelID } : null);
                  setVariant(null);
                }}
                className={cn(SETTINGS_CUSTOM_TRIGGER_CLASS, 'w-full')}
                placeholder={t('settings.routing.model.useFallback')}
              />
            </SettingsStackedField>

            <SettingsStackedField label={t('settings.routing.category.thinking')}>
              <VariantSelect
                providerID={model?.providerID}
                modelID={model?.modelID}
                value={variant}
                onChange={setVariant}
                ariaLabel={t('settings.routing.category.thinking')}
                triggerClassName={SETTINGS_SELECT_TRIGGER_CLASS}
              />
            </SettingsStackedField>
          </div>

          <SettingsStackedField
            label={t('settings.routing.category.description')}
            info={t('settings.routing.category.descriptionInfo')}
            controlClassName="w-full max-w-none"
          >
            <div className="w-full">
              <Textarea
                ref={descriptionTextareaRef}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('settings.routing.category.descriptionPlaceholder')}
                aria-label={t('settings.routing.category.description')}
                aria-invalid={descriptionError ? true : undefined}
                aria-describedby={descriptionError ? descriptionErrorId : undefined}
                rows={5}
                maxLength={2000}
                className="w-full"
              />
              {descriptionError ? (
                <p id={descriptionErrorId} className="mt-1 typography-meta text-[var(--status-error)]">
                  {descriptionError}
                </p>
              ) : null}
            </div>
          </SettingsStackedField>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {t('settings.common.actions.cancel')}
            </Button>
            <Button type="submit" size="sm">
              {t('settings.routing.categories.createDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

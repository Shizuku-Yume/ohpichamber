import React from 'react';
import type { Part } from '@openchamber/agent-contract';
import { ReasoningTimelineBlock } from './ReasoningPart';
import { cleanReasoningText } from './reasoningText';

interface JustificationBlockProps {
    part: Part;
    messageId: string;
    actions?: React.ReactNode;
}

const JustificationBlock: React.FC<JustificationBlockProps> = ({
    part,
    messageId,
    actions,
}) => {
    const rawText = part.type === 'text' || part.type === 'reasoning' ? part.content : '';
    const textContent = React.useMemo(() => cleanReasoningText(rawText), [rawText]);

    // Don't render if there's no text content
    if (!textContent || textContent.trim().length === 0) {
        return null;
    }

    return (
        <ReasoningTimelineBlock
            text={textContent}
            variant="justification"
            blockId={part.partId || `${messageId}-justification`}
            actions={actions}
        />
    );
};

export default React.memo(JustificationBlock);

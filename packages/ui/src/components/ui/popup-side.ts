/**
 * Picking a popup's side once per open.
 *
 * Base UI flips a popup to the other side by itself when its side is short of
 * room, and most popups rely on that. A popup that must not move while open,
 * such as one with a search field that stays put while results filter,
 * disables flipping and takes its side from here instead: measured when it
 * opens, kept until it closes.
 */

type PopupSide = 'top' | 'bottom';

/** Room on the preferred side, in px, below which the popup opens on the other side. */
const MIN_ROOM = 240;

/**
 * The preferred side, unless it has less than `MIN_ROOM` and the other side
 * has more. `bounds` is the area the popup is kept inside, already clipped to
 * the window.
 */
export const choosePopupSide = (
    preferred: PopupSide,
    trigger: { top: number; bottom: number },
    bounds: { top: number; bottom: number },
): PopupSide => {
    const room = { top: trigger.top - bounds.top, bottom: bounds.bottom - trigger.bottom };
    const other = preferred === 'top' ? 'bottom' : 'top';
    return room[preferred] < MIN_ROOM && room[other] > room[preferred] ? other : preferred;
};

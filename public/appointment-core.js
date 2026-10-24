(function () {
  'use strict';

  const integerIn = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

  function parseTime(value) {
    if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return null;
    const [hours, minutes] = value.split(':').map(Number);
    return integerIn(hours, 0, 23) && integerIn(minutes, 0, 59) ? hours * 60 + minutes : null;
  }

  function formatTime(value) {
    if (!integerIn(value, 0, 1439)) return '';
    return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
  }

  // Every segment is counted through arrival at the next destination, including a safety buffer.
  function plan(activity, slotValue, filters) {
    if (!activity || !filters || activity.demo === false) return null;
    const start = parseTime(filters.start);
    const slot = typeof slotValue === 'string' ? parseTime(slotValue) : slotValue;
    const buffer = filters.buffer === undefined ? 10 : filters.buffer;
    if (start === null || !integerIn(slot, 0, 1439) || !integerIn(filters.duration, 15, 300) || !integerIn(buffer, 0, 60)) return null;
    if (!integerIn(activity.duration, 1, 180)) return null;
    const deadline = start + filters.duration;
    if (deadline > 1439) return null;
    const finish = filters.finish || filters.location;
    const outbound = activity.walks?.[filters.location];
    const back = activity.walks?.[finish];
    if (!integerIn(outbound, 0, 180) || !integerIn(back, 0, 180)) return null;
    const arrival = start + outbound;
    if (slot < arrival) return null;
    const wait = slot - arrival;
    const activityMinutes = activity.duration;
    const activityEnd = slot + activityMinutes;
    const returnETA = activityEnd + back;
    const safeFinish = returnETA + buffer;
    if (safeFinish > deadline) return null;
    return { start, deadline, slot, arrival, wait, outbound, activityMinutes, activityEnd, back, returnETA, buffer, safeFinish, slack: deadline - safeFinish, total: safeFinish - start };
  }

  globalThis.TTAppointment = Object.freeze({ plan, parseTime, formatTime });
})();

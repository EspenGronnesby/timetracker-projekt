export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const getTotalSeconds = (startTime: Date, endTime?: Date): number => {
  const end = endTime || new Date();
  return Math.floor((end.getTime() - startTime.getTime()) / 1000);
};

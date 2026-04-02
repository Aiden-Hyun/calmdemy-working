import { useQuery } from '@tanstack/react-query';
import { getAudioUrlFromPath } from '../../constants/audioFiles';

interface SoundWithAudio {
  id: string;
  audioPath?: string;
}

async function resolveAudioUrls(sounds: SoundWithAudio[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  for (const sound of sounds) {
    if (sound.audioPath) {
      const url = await getAudioUrlFromPath(sound.audioPath);
      if (url) urls.set(sound.id, url);
    }
  }
  return urls;
}

export function useAudioUrls(sounds: SoundWithAudio[]) {
  const soundIds = sounds.map((s) => s.id).sort().join(',');

  return useQuery({
    queryKey: ['audioUrls', soundIds],
    queryFn: () => resolveAudioUrls(sounds),
    enabled: sounds.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes — matches Firebase signed URL TTL
  });
}

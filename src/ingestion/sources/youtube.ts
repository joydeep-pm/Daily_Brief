import { google, youtube_v3 } from 'googleapis';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { YoutubeTranscript } = require('youtube-transcript');
import { SourceHandler, SourceConfig, SourceItem } from '../types.js';

export class YouTubeHandler implements SourceHandler {
  private youtube: youtube_v3.Youtube;

  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY
    });
  }

  async fetch(source: SourceConfig, lastProcessedTime?: Date): Promise<SourceItem[]> {
    if (!source.channelId) {
      throw new Error(`YouTube source "${source.name}" missing channelId`);
    }

    try {
      // Fetch recent uploads from channel
      const uploadsPlaylistId = await this.getUploadsPlaylistId(source.channelId);
      const videos = await this.getRecentVideos(uploadsPlaylistId, lastProcessedTime);

      const items: SourceItem[] = [];

      for (const video of videos) {
        try {
          const item = await this.processVideo(video, source);
          if (item) {
            items.push(item);
          }
        } catch (error) {
          console.warn(`Failed to process video ${video.id}: ${error instanceof Error ? error.message : String(error)}`);
          // Continue processing other videos
        }
      }

      return items;
    } catch (error) {
      throw new Error(`Failed to fetch YouTube videos: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getUploadsPlaylistId(channelId: string): Promise<string> {
    const response = await this.youtube.channels.list({
      part: ['contentDetails'],
      id: [channelId]
    });

    const uploadsPlaylistId = response.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      throw new Error('Could not find uploads playlist for channel');
    }

    return uploadsPlaylistId;
  }

  private async getRecentVideos(
    playlistId: string,
    lastProcessedTime?: Date
  ): Promise<Array<{ id: string; publishedAt: Date; title: string; description: string; duration: number }>> {
    const response = await this.youtube.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId: playlistId,
      maxResults: 10 // Fetch last 10 videos
    });

    const videoIds = response.data.items
      ?.map(item => item.contentDetails?.videoId)
      .filter((id): id is string => !!id) || [];

    if (videoIds.length === 0) {
      return [];
    }

    // Get video details including duration
    const detailsResponse = await this.youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: videoIds
    });

    const videos = detailsResponse.data.items?.map(video => {
      const publishedAt = new Date(video.snippet?.publishedAt || '');
      const duration = this.parseDuration(video.contentDetails?.duration || 'PT0S');

      return {
        id: video.id || '',
        publishedAt,
        title: video.snippet?.title || 'Untitled',
        description: video.snippet?.description || '',
        duration
      };
    }) || [];

    // Filter by last processed time
    if (lastProcessedTime) {
      return videos.filter(v => v.publishedAt > lastProcessedTime);
    }

    return videos;
  }

  private parseDuration(isoDuration: string): number {
    // Parse ISO 8601 duration (e.g., PT15M33S -> 933 seconds)
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }

  private async processVideo(
    video: { id: string; publishedAt: Date; title: string; description: string; duration: number },
    source: SourceConfig
  ): Promise<SourceItem | null> {
    const durationMinutes = video.duration / 60;
    let content = '';

    try {
      // Adaptive transcript extraction
      if (durationMinutes < 15) {
        // Full transcript for short videos
        const transcript = await YoutubeTranscript.fetchTranscript(video.id);
        content = transcript.map(t => t.text).join(' ');
      } else {
        // First 10 minutes for long videos
        const transcript = await YoutubeTranscript.fetchTranscript(video.id);
        const tenMinutesInMs = 10 * 60 * 1000;
        const filteredTranscript = transcript.filter(t => t.offset < tenMinutesInMs);
        content = filteredTranscript.map(t => t.text).join(' ');
        content += '\n\n[Note: Transcript truncated to first 10 minutes]';
      }
    } catch (error) {
      // Fallback to description if transcript unavailable
      console.warn(`Transcript unavailable for video ${video.id}, using description`);
      content = video.description;
    }

    if (!content.trim()) {
      return null;
    }

    return {
      id: video.id,
      title: video.title,
      content: this.cleanTranscript(content),
      url: `https://www.youtube.com/watch?v=${video.id}`,
      publishedAt: video.publishedAt,
      category: source.category,
      sourceName: source.name
    };
  }

  private cleanTranscript(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\[Music\]/gi, '')
      .replace(/\[Applause\]/gi, '')
      .trim();
  }
}

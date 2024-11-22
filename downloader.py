from typing import Any, Dict

import yt_dlp

def download_video(
    video_url: str,
    output_path: str,
    progress_hooks: list = [],
):
    ydl_opts = {
        'outtmpl': output_path,
        'format': 'best',
        'noplaylist': True,
        'quiet': False,
        'progress_hooks': progress_hooks,
        'video_ext': 'mp4',
        # Use Chrome cookies for authentication
        # 'cookiesfrombrowser': ('chrome',),
        'extractor_args': {'tiktok': {'webpage_download': True}},
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])
            return True
    except yt_dlp.utils.DownloadError as e:
        raise Exception(f"Error downloading video: {str(e)}")
    except Exception as e:
        raise Exception(f"An unexpected error occurred: {str(e)}")


def progress_hook(d: Dict[str, Any]) -> None:
    """
    Hook to display download progress

    Args:
        d (Dict[str, Any]): Progress information dictionary
    """
    if d['status'] == 'downloading':
        progress = d.get('_percent_str', 'N/A')
        speed = d.get('_speed_str', 'N/A')
        eta = d.get('_eta_str', 'N/A')
        print(f"Downloading: {progress} at {speed} ETA: {eta}", end='\r')
    elif d['status'] == 'finished':
        print("\nDownload completed, finalizing...")

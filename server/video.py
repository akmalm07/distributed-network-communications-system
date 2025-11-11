import ffmpeg
import tempfile
import os

def get_video_duration(raw_data: bytes) -> float:
    # Save temporarily to a file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp: # set delete=true for production
        tmp.write(raw_data)
        tmp.flush()

        # Run ffprobe to extract metadata
        try:
            probe = ffmpeg.probe(tmp.name)
            return float(probe['format']['duration'])
        except ffmpeg.Error as e:
            print("🔴 ffprobe stderr output:")
            print(e.stderr.decode('utf-8'))
            raise RuntimeError("Failed to get video duration") from e

def within_range(item1: float, item2: float, tolerance: float = 0.5) -> bool:
    return abs(item1 - item2) <= tolerance

def compress_video(raw_data: bytes, ext: str) -> bytes:
    input_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f'.{ext}')
    input_tmp.write(raw_data)
    input_tmp.flush()
    input_tmp.close() 

    output_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f'.{ext}')
    output_tmp.close()  

    try:
        (
            ffmpeg
            .input(input_tmp.name)
            .output(output_tmp.name, vcodec='libx264', crf=30, preset='veryfast')
            .run(overwrite_output=True)
        )

        with open(output_tmp.name, 'rb') as f:
            compressed_data = f.read()

        return compressed_data

    except ffmpeg.Error as e:
        print("🔴 ffmpeg stderr output:")
        print(e.stderr.decode('utf-8'))
        raise RuntimeError("Failed to compress video") from e

    finally:
        for path in [input_tmp.name, output_tmp.name]:
            try:
                os.remove(path)
            except FileNotFoundError:
                pass

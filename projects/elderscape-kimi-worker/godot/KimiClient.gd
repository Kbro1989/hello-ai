# KimiClient.gd
# This script handles communication with the Cloudflare Worker endpoint for Kimi AI.
extends Node

# TODO: Replace this with your actual worker URL after deployment.
# It should look like: "https://elderscape-kimi-worker.<your-cf-subdomain>.workers.dev"
export var worker_base_url = "YOUR_WORKER_BASE_URL_HERE"

# TODO: This must match the KIMI_KEY secret in your worker.
# For local testing, it matches the [vars] key in wrangler.toml.
# For production, it must match the key set with `wrangler secret put`.
export var auth_key = "your-local-dev-key"

# Signal emitted when a text response is received from the AI.
signal kimi_response_received(reply)
# Signal emitted when audio has been transcribed to text.
signal transcription_received(text)

# Keep a reference to the current HTTP request to prevent spamming.
var _http_request: HTTPRequest
var _current_request_type: String = "" # "query" or "transcribe"

# Audio recording variables
var _is_recording: bool = false
var _audio_capture: AudioEffectCapture
var _audio_stream_player: AudioStreamPlayer # To play back recorded audio (optional)
var _recorded_audio_buffer: PoolByteArray # Buffer to store recorded audio

# Sends a text prompt to the Kimi AI via the worker.
# Connect to the 'kimi_response_received' signal to get the result.
# Example Usage:
# KimiClient.ask_kimi("Hello, what is your name?", "player123", "npc_guard_stormcrown", "Stormcrown Highlands")
func ask_kimi(prompt: String, player_id: String, npc_id: String, region: String):
	if _http_request and _http_request.is_processing():
		print("KimiClient: Request already in progress.")
		return

	_current_request_type = "query"
	_http_request = HTTPRequest.new()
	add_child(_http_request)
	_http_request.connect("request_completed", self, "_on_request_completed")

	var headers = ["Content-Type: application/json"]
	var body = {
		"prompt": prompt,
		"key": auth_key,
		"player_id": player_id,
		"npc_id": npc_id,
		"region": region
	}
	var json_body = JSON.print(body)

	var error = _http_request.request(worker_base_url + "/ai/query", headers, true, HTTPRequest.METHOD_POST, json_body)
	if error != OK:
		print("KimiClient: An error occurred in the HTTPRequest for query.")
		_cleanup_request()

# --- Voice Transcription Functions ---

func _ready():
	# Initialize audio capture
	var bus_idx = AudioServer.get_bus_index("Master")
	if bus_idx != -1:
		for i in range(AudioServer.get_bus_effect_count(bus_idx)):
			var effect = AudioServer.get_bus_effect(bus_idx, i)
			if effect is AudioEffectCapture:
				_audio_capture = effect
				break
		if not _audio_capture:
			_audio_capture = AudioEffectCapture.new()
			AudioServer.add_bus_effect(bus_idx, _audio_capture)
	else:
		print("KimiClient: Master audio bus not found.")

	_audio_stream_player = AudioStreamPlayer.new()
	add_child(_audio_stream_player)


func start_recording():
	if _is_recording:
		return

	if not _audio_capture:
		print("KimiClient: Audio capture not initialized.")
		return

	_recorded_audio_buffer = PoolByteArray()
	_is_recording = true
	print("KimiClient: Recording started...")

func stop_recording_and_transcribe():
	if not _is_recording:
		return

	_is_recording = false
	print("KimiClient: Recording stopped. Processing audio...")

	if _recorded_audio_buffer.empty():
		print("KimiClient: Recorded audio buffer is empty.")
		return

	# For simplicity, we'll send raw WAV data.
	# For production, consider encoding to Opus or a more compressed format.
	var wav_data = _create_wav_header(_recorded_audio_buffer.size()) + _recorded_audio_buffer
	send_audio_for_transcription(wav_data)

func _process(delta):
	if _is_recording and _audio_capture:
		var frames_available = _audio_capture.get_frames_available()
		if frames_available > 0:
			var audio_frames = _audio_capture.get_buffer(frames_available)
			# Convert AudioFrame to raw bytes (assuming 16-bit mono for simplicity)
			for frame in audio_frames:
				# Assuming mono, take left channel
				var sample = int(clamp(frame.x, -1.0, 1.0) * 32767) # Convert float to 16-bit signed int
				_recorded_audio_buffer.append(sample & 0xFF)
				_recorded_audio_buffer.append((sample >> 8) & 0xFF)

# Helper to create a basic WAV header (mono, 16-bit, 44100 Hz)
func _create_wav_header(data_size: int) -> PoolByteArray:
	var header = PoolByteArray()
	var sample_rate = 44100
	var num_channels = 1
	var bits_per_sample = 16
	var byte_rate = sample_rate * num_channels * bits_per_sample / 8
	var block_align = num_channels * bits_per_sample / 8

	# RIFF chunk
	header.append_array("RIFF".to_utf8())
	header.append_array(int_to_byte_array(data_size + 36, 4)) # ChunkSize
	header.append_array("WAVE".to_utf8())

	# FMT chunk
	header.append_array("fmt ".to_utf8())
	header.append_array(int_to_byte_array(16, 4)) # Subchunk1Size (16 for PCM)
	header.append_array(int_to_byte_array(1, 2)) # AudioFormat (1 for PCM)
	header.append_array(int_to_byte_array(num_channels, 2))
	header.append_array(int_to_byte_array(sample_rate, 4))
	header.append_array(int_to_byte_array(byte_rate, 4))
	header.append_array(int_to_byte_array(block_align, 2))
	header.append_array(int_to_byte_array(bits_per_sample, 2))

	# DATA chunk
	header.append_array("data".to_utf8())
	header.append_array(int_to_byte_array(data_size, 4)) # Subchunk2Size

	return header

func int_to_byte_array(value: int, num_bytes: int) -> PoolByteArray:
	var arr = PoolByteArray()
	for i in range(num_bytes):
		arr.append((value >> (i * 8)) & 0xFF)
	return arr


func send_audio_for_transcription(audio_data: PoolByteArray):
	if _http_request and _http_request.is_processing():
		print("KimiClient: Request already in progress.")
		return

	_current_request_type = "transcribe"
	_http_request = HTTPRequest.new()
	add_child(_http_request)
	_http_request.connect("request_completed", self, "_on_request_completed")

	var headers = [] # Content-Type will be set by HTTPRequest for multipart/form-data
	var boundary = "----WebKitFormBoundary" + str(randi()) # Simple boundary

	var body_parts = []

	# Add key field
	body_parts.append("--" + boundary)
	body_parts.append("Content-Disposition: form-data; name=\"key\"")
	body_parts.append("")
	body_parts.append(auth_key)

	# Add file field
	body_parts.append("--" + boundary)
	body_parts.append("Content-Disposition: form-data; name=\"file\"; filename=\"audio.wav\"")
	body_parts.append("Content-Type: audio/wav") # Or audio/opus if you encode
	body_parts.append("")
	body_parts.append(audio_data) # Append raw byte array directly

	body_parts.append("--" + boundary + "--")
	body_parts.append("") # Final newline

	var full_body = PoolByteArray()
	for part in body_parts:
		if typeof(part) == TYPE_STRING:
			full_body.append_array(part.to_utf8())
		elif typeof(part) == TYPE_POOL_BYTE_ARRAY:
			full_body.append_array(part)
		full_body.append_array("\r\n".to_utf8()) # Newline for each part

	headers.append("Content-Type: multipart/form-data; boundary=" + boundary)

	var error = _http_request.request(worker_base_url + "/ai/transcribe", headers, true, HTTPRequest.METHOD_POST, full_body)
	if error != OK:
		print("KimiClient: An error occurred in the HTTPRequest for transcription.")
		_cleanup_request()


# Called when the HTTP request is completed.
func _on_request_completed(result, response_code, headers, body):
	if result != HTTPRequest.RESULT_SUCCESS:
		print("KimiClient: Request failed with result code: ", result)
		if _current_request_type == "query":
			emit_signal("kimi_response_received", "[Network Error]")
		elif _current_request_type == "transcribe":
			emit_signal("transcription_received", "[Network Error]")
		_cleanup_request()
		return

	if response_code >= 400:
		print("KimiClient: Request failed with status code: ", response_code)
		print("KimiClient: Response body: ", body.get_string_from_utf8())
		if _current_request_type == "query":
			emit_signal("kimi_response_received", "[Server Error]")
		elif _current_request_type == "transcribe":
			emit_signal("transcription_received", "[Server Error]")
		_cleanup_request()
		return

	var json_response = JSON.parse(body.get_string_from_utf8())
	if json_response.error != OK:
		print("KimiClient: Failed to parse JSON response.")
		if _current_request_type == "query":
			emit_signal("kimi_response_received", "[Response Parse Error]")
		elif _current_request_type == "transcribe":
			emit_signal("transcription_received", "[Response Parse Error]")
	else:
		var data = json_response.result
		if _current_request_type == "query":
			if data.has("reply"):
				emit_signal("kimi_response_received", data.reply)
			else:
				print("KimiClient: 'reply' not found in query response.")
				emit_signal("kimi_response_received", "[Invalid Query Response]")
		elif _current_request_type == "transcribe":
			if data.has("text"):
				emit_signal("transcription_received", data.text)
			else:
				print("KimiClient: 'text' not found in transcription response.")
				emit_signal("transcription_received", "[Invalid Transcription Response]")

	_cleanup_request()

# Clean up the HTTPRequest node after it's done.
func _cleanup_request():
	if _http_request:
		_http_request.queue_free()
		_http_request = null
	_current_request_type = ""

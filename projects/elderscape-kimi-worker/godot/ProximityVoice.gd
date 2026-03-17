# ProximityVoice.gd
# Handles proximity detection, voice recording, and sending audio to Kimi.

extends Area2D

# Export variables for easy tweaking in the editor
export var detection_radius: float = 5.0  # meters / Godot units
export var npc_id: String = "stormcrown_guard_1"
export var region: String = "Stormcrown Highlands"

# Reference to the player node - adjust to your actual player path
onready var player = get_node_or_null("/root/Player")

# State variables
var _is_recording = false
var _player_in_range = false

signal voice_interaction_started()
signal voice_interaction_ended(transcribed_text)

func _ready():
    if not player:
        print("ProximityVoice Error: Player node not found at '/root/Player'. Please adjust the path.")
        return

    # Assuming this script is attached to an Area2D with a CollisionShape2D
    var shape = get_node_or_null("CollisionShape2D")
    if shape and shape is CollisionShape2D and shape.shape is CircleShape2D:
        shape.shape.radius = detection_radius
    else:
        print("ProximityVoice Warning: No CircleShape2D found. Proximity detection might not work as expected.")

    # Connect signals for KimiClient
    KimiClient.connect("transcription_received", self, "_on_transcription_received")
    KimiClient.connect("kimi_response_received", self, "_on_kimi_reply")

    # Connect to the Area2D's body_entered and body_exited signals
    connect("body_entered", self, "_on_body_entered")
    connect("body_exited", self, "_on_body_exited")

func _on_body_entered(body):
    if body == player:
        _player_in_range = true
        _on_player_entered_proximity()

func _on_body_exited(body):
    if body == player:
        _player_in_range = false
        _on_player_left_proximity()

func _on_player_entered_proximity():
    print("Player in range of NPC: ", npc_id)
    # Optionally auto-start recording or show a "Press to Talk" prompt
    # For now, we'll auto-start.
    start_recording()

func _on_player_left_proximity():
    print("Player left NPC proximity: ", npc_id)
    if _is_recording:
        stop_recording_and_transcribe()

func start_recording():
    if _is_recording:
        return
    _is_recording = true
    KimiClient.start_recording()
    emit_signal("voice_interaction_started")
    print("ProximityVoice: Recording started for NPC ", npc_id)

func stop_recording_and_transcribe():
    if not _is_recording:
        return
    _is_recording = false
    KimiClient.stop_recording_and_transcribe()
    print("ProximityVoice: Recording stopped, sending to Kimi...")

func _on_transcription_received(transcribed_text):
    # Ensure this handler only processes transcriptions relevant to this NPC
    if not _player_in_range:
        return

    print("Transcribed for ", npc_id, ": ", transcribed_text)
    emit_signal("voice_interaction_ended", transcribed_text)
    if transcribed_text != "[Network Error]" and transcribed_text != "[Server Error]" and transcribed_text != "[Response Parse Error]":
        # Assuming the player node has a 'player_id' property
        var player_id = "player123" # Default or get from player node
        if player.has_method("get_player_id"):
             player_id = player.get_player_id()

        # Send transcribed text to Kimi for NPC reply
        KimiClient.ask_kimi(transcribed_text, player_id, npc_id, region)

func _on_kimi_reply(reply):
    # Ensure this handler only processes replies when the player is in range
    if not _player_in_range:
        return

    print("NPC ", npc_id, " says: ", reply)
    # TODO: Hook into your UI or TTS system to display the reply.

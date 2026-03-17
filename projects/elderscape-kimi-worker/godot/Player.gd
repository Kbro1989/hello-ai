# Player.gd
extends KinematicBody2D

export(int) var speed = 300
export var player_id = "player_hero_1"

func _physics_process(delta):
    var input_vector = Vector2(
        Input.get_action_strength("ui_right") - Input.get_action_strength("ui_left"),
        Input.get_action_strength("ui_down") - Input.get_action_strength("ui_up")
    )
    input_vector = input_vector.normalized() * speed
    move_and_slide(input_vector)

func get_player_id():
	return player_id
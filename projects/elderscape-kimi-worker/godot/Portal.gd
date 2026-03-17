# Portal.gd
extends Area2D

export(String) var target_time_layer = ""
export(NodePath) var target_location_node

signal player_entered_portal(target_node)

func _ready():
    connect("body_entered", self, "_on_body_entered")

func _on_body_entered(body):
    if body.name == "Player":
        var target_node = get_node_or_null(target_location_node)
        if target_node:
            emit_signal("player_entered_portal", target_node)
            # Move player to the target portal's position within the new location node
            body.global_position = target_node.global_position
            print("Player teleported to: ", target_time_layer)

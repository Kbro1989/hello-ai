# LoreLoader.gd
# Dynamically spawns NPCs, phenomena, and environment objects based on JSON lore data.
# Connects eras and sub-locations via portals, stairs, ladders, and hidden entryways.

extends Node

class_name LoreLoader

# Spawns NPCs and environmental objects into a LocationNode from JSON
static func load_lore(location_node: Node2D, era: String, region: String):
    var people_file = "res://godot/lore/%s_people.json" % region.to_lower().replace(" ", "_")
    var folklore_file = "res://godot/lore/%s_folklore.json" % region.to_lower().replace(" ", "_")

    # Spawn NPCs
    if FileAccess.file_exists(people_file):
        var f = FileAccess.open(people_file, FileAccess.READ)
        var npc_data = JSON.parse_string(f.get_as_text())
        f.close()
        if npc_data.error == OK:
            for npc in npc_data.result:
                if npc.era == era:
                    var npc_instance = preload("res://godot/NpcPrefab.tscn").instantiate()
                    npc_instance.position = Vector2(npc.position[0], npc.position[1])
                    npc_instance.get_node("ProximityArea").npc_id = npc.npc_id
                    npc_instance.get_node("ProximityArea").region = npc.region
                    npc_instance.get_node("ProximityArea").detection_radius = npc.detection_radius
                    location_node.add_child(npc_instance)

    # Spawn Environmental Features
    if FileAccess.file_exists(folklore_file):
        var f2 = FileAccess.open(folklore_file, FileAccess.READ)
        var env_data = JSON.parse_string(f2.get_as_text())
        f2.close()
        if env_data.error == OK:
            for item in env_data.result:
                if item.era == era:
                    var env_node = Node2D.new()
                    env_node.position = Vector2(item.position[0], item.position[1])
                    env_node.name = item.phenomenon if item.has("phenomenon") else item.feature
                    location_node.add_child(env_node)

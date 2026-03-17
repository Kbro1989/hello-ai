# LocationNode.gd
extends Node2D

export(String) var era_name = "Dark Ages"
export(String) var region_name = "Ashen Wastes"

func _ready():
    # Load all era-specific NPCs, cryptids, environment
    LoreLoader.load_lore(self, era_name, region_name)
    print("Lore loaded for ", region_name, " in era: ", era_name)
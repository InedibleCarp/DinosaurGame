import Phaser from 'phaser';

class DinoRunScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DinoRunScene' });
  }

  preload() {
    // Load assets here (make sure to add your assets in an "assets" folder)
    this.load.image('dino', 'assets/dino.png');       // Your dino image
    this.load.image('obstacle', 'assets/obstacle.png'); // Your obstacle image
  }

  create() {
    // Create the player (dino) sprite
    this.player = this.physics.add.sprite(100, 300, 'dino');
    this.player.setCollideWorldBounds(true);

    // Create a group for obstacles
    this.obstacles = this.physics.add.group();

    // Add keyboard input for jumping
    this.input.keyboard.on('keydown-SPACE', () => {
      this.player.setVelocityY(-300);
    });

    // Spawn obstacles every 2 seconds
    this.time.addEvent({
      delay: 2000,
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true
    });
  }

  spawnObstacle() {
    // Create an obstacle sprite at the right edge of the screen
    const obstacle = this.obstacles.create(800, 300, 'obstacle');
    obstacle.setVelocityX(-200);
    obstacle.setCollideWorldBounds(false);
  }

  update() {
    // Here you can add collision detection, score updates, etc.
    // For example, check if an obstacle has passed the left edge and destroy it:
    this.obstacles.children.iterate((obstacle) => {
      if (obstacle && obstacle.x < -50) {
        obstacle.destroy();
      }
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 500 },
      debug: false
    }
  },
  scene: [DinoRunScene]
};

const game = new Phaser.Game(config);

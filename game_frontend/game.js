// Fixed game.js with corrected parallax scrolling

// If you're using script tags instead of modules, comment out this line
// import Phaser from 'phaser';

class DinoRunScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DinoRunScene' });
    this.score = 0;
    this.isGameOver = false;
    this.gameSpeed = 200;
    
    // Properties for parallax
    this.backgroundLayers = [];
    this.parallaxSpeeds = [0.2, 0.4, 0.6, 1.0]; // Adjusted speeds - ground moves at full speed
  }

  preload() {
    // Load assets
    this.load.svg('dino', 'assets/dino.svg');
    this.load.svg('obstacle', 'assets/cactus.svg');
    this.load.svg('ground', 'assets/ground.svg');
    this.load.svg('sky', 'assets/sky.svg');
    
    // New parallax assets
    this.load.svg('mountains', 'assets/mountains.svg');
    this.load.svg('clouds', 'assets/clouds.svg');
    this.load.svg('bushes', 'assets/bushes.svg');
  }

  create() {
    // Add sky background (static, doesn't move)
    this.add.image(400, 300, 'sky').setDisplaySize(800, 600);
    
    // Create parallax layers
    this.createParallaxBackground();
    
    // Create the ground physics
    this.ground = this.physics.add.staticGroup();
    const groundSprite = this.ground.create(400, 550, 'ground');
    groundSprite.setVisible(false); // Hide the actual physics ground
    groundSprite.setDisplaySize(800, 100);
    groundSprite.refreshBody();
    
    // Create the player (dino) sprite
    this.player = this.physics.add.sprite(100, 500, 'dino');
    this.player.setDisplaySize(60, 60);
    this.player.setCollideWorldBounds(true);
    this.player.setGravityY(800);
    this.player.setOrigin(0.5, 1);

    // Add collision between player and ground
    this.physics.add.collider(this.player, this.ground);

    // Create a group for obstacles
    this.obstacles = this.physics.add.group();

    // Add keyboard input for jumping
    this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Create score text
    this.scoreText = this.add.text(16, 16, 'Score: 0', { 
      fontSize: '24px', 
      fill: '#000' 
    });
    
    // Game over text (hidden initially)
    this.gameOverText = this.add.text(400, 200, 'GAME OVER', { 
      fontSize: '48px', 
      fill: '#ff0000',
      fontStyle: 'bold' 
    }).setOrigin(0.5);
    this.gameOverText.setVisible(false);
    
    this.restartText = this.add.text(400, 250, 'Press SPACE to restart', { 
      fontSize: '24px', 
      fill: '#000' 
    }).setOrigin(0.5);
    this.restartText.setVisible(false);
    
    // Spawn obstacles every 1.5-3 seconds (random)
    this.obstacleTimer = this.time.addEvent({
      delay: Phaser.Math.Between(1500, 3000),
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: false
    });

    // Add collision between player and obstacles
    this.physics.add.collider(this.player, this.obstacles, this.hitObstacle, null, this);

    // Set up score incrementing
    this.scoreTimer = this.time.addEvent({
      delay: 100,
      callback: this.incrementScore,
      callbackScope: this,
      loop: true
    });
  }
  
  // Create parallax background layers
  createParallaxBackground() {
    // Layer 1: Distant mountains (slowest)
    // Positioned higher up to align with ground
    this.createParallaxLayer('mountains', 400, 470, 800, 150, 0);
    
    // Layer 2: Far clouds
    this.createParallaxLayer('clouds', 400, 200, 800, 100, 1);
    
    // Layer 3: Bushes (closer to player)
    this.createParallaxLayer('bushes', 400, 520, 800, 80, 2);
    
    // Ground layer (fastest - should match obstacle speed)
    this.groundLayer = this.createParallaxLayer('ground', 400, 550, 800, 100, 3);
  }
  
  // Helper method to create each layer - FIXED to prevent disappearing
  createParallaxLayer(key, x, y, width, height, layerIndex) {
    // Create three copies of the same image side by side instead of two
    // This prevents gaps appearing during scrolling
    const layer1 = this.add.image(x - width, y, key).setDisplaySize(width, height);
    const layer2 = this.add.image(x, y, key).setDisplaySize(width, height);
    const layer3 = this.add.image(x + width, y, key).setDisplaySize(width, height);
    
    // Store all three images as a layer group
    const layerGroup = { 
      images: [layer1, layer2, layer3],
      speed: this.parallaxSpeeds[layerIndex] * this.gameSpeed,
      width: width,
      x: x,  // Store initial x position for reset
      y: y   // Store y position for reset
    };
    
    this.backgroundLayers.push(layerGroup);
    return layerGroup;
  }
  
  // Update parallax layers - FIXED to ensure continuous scrolling
  updateParallaxLayers() {
    // Update each layer
    this.backgroundLayers.forEach(layer => {
      // Move all images of the layer
      layer.images.forEach(image => {
        // Move the image based on its speed
        image.x -= layer.speed * (1/60); // Adjust for framerate
      });
      
      // Get the leftmost and rightmost images
      const sortedImages = [...layer.images].sort((a, b) => a.x - b.x);
      const leftmost = sortedImages[0];
      const rightmost = sortedImages[sortedImages.length - 1];
      
      // If the leftmost image has moved too far left
      if (leftmost.x < -layer.width) {
        // Place it to the right of the rightmost image
        leftmost.x = rightmost.x + layer.width;
      }
    });
  }
  
  incrementScore() {
    if (!this.isGameOver) {
      this.score += 1;
      this.scoreText.setText('Score: ' + this.score);
      
      // Increase game speed over time
      if (this.score % 100 === 0) {
        this.gameSpeed += 20;
        
        // Update layer speeds when game speed changes
        this.backgroundLayers.forEach((layer, index) => {
          layer.speed = this.parallaxSpeeds[index] * this.gameSpeed;
        });
      }
    }
  }
  
  hitObstacle() {
    this.physics.pause();
    this.player.setTint(0xff0000);
    this.isGameOver = true;
    this.gameOverText.setVisible(true);
    this.restartText.setVisible(true);
    this.scoreTimer.remove();
    
    // Submit score to backend
    this.submitScore();
  }
  
  async submitScore() {
    try {
      const response = await fetch('http://127.0.0.1:8080/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Player', // Ideally get this from user input
          score: this.score
        })
      });
      
      if (response.ok) {
        console.log('Score submitted successfully!');
      }
    } catch (error) {
      console.error('Failed to submit score:', error);
      
      // Store score locally as a fallback
      const localScores = JSON.parse(localStorage.getItem('dinoScores') || '[]');
      localScores.push({
        name: 'Player',
        score: this.score,
        date: new Date().toISOString()
      });
      localStorage.setItem('dinoScores', JSON.stringify(localScores));
    }
  }

  spawnObstacle() {
    if (this.isGameOver) return;
    
    // Create an obstacle sprite at the right edge of the screen
    const obstacle = this.obstacles.create(800, 510, 'obstacle');
    obstacle.setDisplaySize(50, 80);
    obstacle.setOrigin(0.5, 1);
    obstacle.setVelocityX(-this.gameSpeed);
    obstacle.setImmovable(true);
    
    // Schedule next obstacle
    this.obstacleTimer = this.time.addEvent({
      delay: Phaser.Math.Between(1500, 3000),
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: false
    });
  }

  update() {
    // Only update if game is not over
    if (!this.isGameOver) {
      // Update parallax layers
      this.updateParallaxLayers();
      
      // Jump only when on ground
      if (this.jumpKey.isDown && this.player.body.touching.down) {
        this.player.setVelocityY(-500);
      }
    } else {
      // Handle game restart
      if (this.jumpKey.isDown) {
        this.scene.restart();
        this.score = 0;
        this.isGameOver = false;
        this.gameSpeed = 200;
      }
    }
    
    // Remove obstacles that have gone off screen
    this.obstacles.children.iterate((obstacle) => {
      if (obstacle && obstacle.x < -50) {
        obstacle.destroy();
      }
    });
  }
  
  // New method to reset the game scene
  resetScene() {
    // Reset all layers to their original positions
    this.backgroundLayers.forEach(layer => {
      layer.images[0].x = layer.x - layer.width;
      layer.images[1].x = layer.x;
      layer.images[2].x = layer.x + layer.width;
    });
  }
}

class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LeaderboardScene' });
  }
  
  preload() {
    this.load.svg('sky', 'assets/sky.svg');
  }
  
  create() {
    // Add sky background
    this.add.image(400, 300, 'sky').setDisplaySize(800, 600);
    
    this.add.text(400, 50, 'LEADERBOARD', { 
      fontSize: '36px', 
      fill: '#000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.backText = this.add.text(400, 500, 'Press SPACE to play again', { 
      fontSize: '24px', 
      fill: '#000' 
    }).setOrigin(0.5);
    
    this.loadLeaderboard();
    
    this.input.keyboard.addKey('SPACE').on('down', () => {
      this.scene.start('DinoRunScene');
    });
  }
  
  async loadLeaderboard() {
    try {
      const response = await fetch('http://127.0.0.1:8080/scores');
      if (response.ok) {
        const scores = await response.json();
        
        // Sort scores from highest to lowest
        scores.sort((a, b) => b.score - a.score);
        
        // Display top 10 scores
        const topScores = scores.slice(0, 10);
        topScores.forEach((scoreData, index) => {
          this.add.text(400, 120 + (index * 35), 
            `${index + 1}. ${scoreData.name}: ${scoreData.score}`, { 
            fontSize: '20px', 
            fill: '#000' 
          }).setOrigin(0.5);
        });
        
        if (scores.length === 0) {
          this.add.text(400, 200, 'No scores yet! Be the first!', { 
            fontSize: '20px', 
            fill: '#666' 
          }).setOrigin(0.5);
        }
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      
      // Try to load from localStorage as fallback
      const localScores = JSON.parse(localStorage.getItem('dinoScores') || '[]');
      localScores.sort((a, b) => b.score - a.score);
      
      const topScores = localScores.slice(0, 10);
      topScores.forEach((scoreData, index) => {
        this.add.text(400, 120 + (index * 35), 
          `${index + 1}. ${scoreData.name}: ${scoreData.score}`, { 
          fontSize: '20px', 
          fill: '#000' 
        }).setOrigin(0.5);
      });
      
      if (localScores.length === 0) {
        this.add.text(400, 200, 'Could not load scores from server', { 
          fontSize: '20px', 
          fill: '#ff0000' 
        }).setOrigin(0.5);
        
        this.add.text(400, 230, 'No local scores available', { 
          fontSize: '20px', 
          fill: '#666' 
        }).setOrigin(0.5);
      }
    }
  }
}

class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }
  
  preload() {
    this.load.svg('sky', 'assets/sky.svg');
    this.load.svg('mountains', 'assets/mountains.svg');
    this.load.svg('clouds', 'assets/clouds.svg');
  }
  
  create() {
    // Add sky background
    this.add.image(400, 300, 'sky').setDisplaySize(800, 600);
    
    // Add some background elements for the menu - properly aligned
    this.add.image(400, 470, 'mountains').setDisplaySize(800, 150);
    this.add.image(400, 200, 'clouds').setDisplaySize(800, 100);
    
    // Title
    this.add.text(400, 150, 'DINO RUN', { 
      fontSize: '64px', 
      fill: '#000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Play button
    const playButton = this.add.text(400, 250, 'PLAY', { 
      fontSize: '32px', 
      fill: '#000',
      backgroundColor: '#E0E0E0',
      padding: { left: 20, right: 20, top: 10, bottom: 10 }
    }).setOrigin(0.5).setInteractive();
    
    playButton.on('pointerdown', () => {
      this.scene.start('DinoRunScene');
    });
    
    // Leaderboard button
    const leaderboardButton = this.add.text(400, 320, 'LEADERBOARD', { 
      fontSize: '32px', 
      fill: '#000',
      backgroundColor: '#E0E0E0',
      padding: { left: 20, right: 20, top: 10, bottom: 10 }
    }).setOrigin(0.5).setInteractive();
    
    leaderboardButton.on('pointerdown', () => {
      this.scene.start('LeaderboardScene');
    });
    
    // Instructions
    this.add.text(400, 400, 'Press SPACE to jump', { 
      fontSize: '24px', 
      fill: '#000' 
    }).setOrigin(0.5);
    
    // Keyboard input as alternative
    this.input.keyboard.addKey('SPACE').on('down', () => {
      this.scene.start('DinoRunScene');
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
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [MainMenuScene, DinoRunScene, LeaderboardScene]
};

// If you're using script tags instead of modules, this line is needed
const game = new Phaser.Game(config);
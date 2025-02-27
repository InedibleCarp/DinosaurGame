// Game.js with Day/Night Cycle

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
    
    // Day/Night cycle properties
    this.timeOfDay = 'day';
    this.cycleTimer = 0;
    this.cycleDuration = 30000; // 30 seconds per cycle
    this.dayNightRatio = 0.7; // 70% day, 30% night
    this.transitionDuration = 5000; // 5 seconds for transition
  }

  preload() {
    // Load assets
    this.load.svg('dino', 'assets/dino.svg');
    this.load.svg('obstacle', 'assets/cactus.svg');
    this.load.svg('ground', 'assets/ground.svg');
    this.load.svg('sky', 'assets/sky.svg');
    this.load.svg('sky-night', 'assets/sky-night.svg'); // Load night sky
    
    // New parallax assets
    this.load.svg('mountains', 'assets/mountains.svg');
    this.load.svg('mountains-night', 'assets/mountains-night.svg'); // Load night mountains
    this.load.svg('clouds', 'assets/clouds.svg');
    this.load.svg('clouds-night', 'assets/clouds-night.svg'); // Load night clouds
    this.load.svg('bushes', 'assets/bushes.svg');
    this.load.svg('bushes-night', 'assets/bushes-night.svg'); // Load night bushes
    this.load.svg('moon', 'assets/moon.svg'); // Load moon
    this.load.svg('stars', 'assets/stars.svg'); // Load stars
  }

  create() {
    // Create day/night container for background elements
    this.backgroundContainer = this.add.container(0, 0);
    
    // Add sky background (day version first)
    this.skyDay = this.add.image(400, 300, 'sky').setDisplaySize(800, 600);
    this.skyNight = this.add.image(400, 300, 'sky-night').setDisplaySize(800, 600);
    this.skyNight.setAlpha(0); // Start with day sky
    
    this.backgroundContainer.add(this.skyDay);
    this.backgroundContainer.add(this.skyNight);
    
    // Add sun and moon
    this.sun = this.add.image(680, 80, 'clouds').setDisplaySize(80, 80);
    this.sun.setTint(0xFFD700); // Make it yellow
    this.moon = this.add.image(680, 80, 'moon').setDisplaySize(60, 60);
    this.moon.setAlpha(0); // Start with sun visible
    
    this.backgroundContainer.add(this.sun);
    this.backgroundContainer.add(this.moon);
    
    // Add stars (invisible during day)
    this.stars = this.add.image(400, 150, 'stars').setDisplaySize(800, 300);
    this.stars.setAlpha(0);
    this.backgroundContainer.add(this.stars);
    
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
    
    // Create time of day indicator
    this.timeText = this.add.text(16, 50, 'Day', { 
      fontSize: '20px', 
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
    
    // Create day/night overlay for gradual transitions
    this.dayNightOverlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0);
  }
  
  // Create parallax background layers
  createParallaxBackground() {
    // Create paired layers for day and night
    
    // Layer 1: Mountains
    const mountainsDay = this.createParallaxLayerPair('mountains', 'mountains-night', 400, 470, 800, 150, 0);
    
    // Layer 2: Clouds
    const cloudsDay = this.createParallaxLayerPair('clouds', 'clouds-night', 400, 200, 800, 100, 1);
    
    // Layer 3: Bushes
    const bushesDay = this.createParallaxLayerPair('bushes', 'bushes-night', 400, 520, 800, 80, 2);
    
    // Ground layer
    this.groundLayer = this.createParallaxLayerPair('ground', 'ground', 400, 550, 800, 100, 3);
  }
  
  // Helper method to create pairs of day and night layers
  createParallaxLayerPair(dayKey, nightKey, x, y, width, height, layerIndex) {
    // Create three copies of day and night images
    const dayImages = [];
    const nightImages = [];
    
    for (let i = -1; i <= 1; i++) {
      const dayImg = this.add.image(x + (i * width), y, dayKey).setDisplaySize(width, height);
      const nightImg = this.add.image(x + (i * width), y, nightKey).setDisplaySize(width, height);
      
      // Start with night images invisible
      nightImg.setAlpha(0);
      
      dayImages.push(dayImg);
      nightImages.push(nightImg);
      
      this.backgroundContainer.add(dayImg);
      this.backgroundContainer.add(nightImg);
    }
    
    // Store both day and night images as a layer group
    const layerGroup = { 
      dayImages: dayImages,
      nightImages: nightImages,
      speed: this.parallaxSpeeds[layerIndex] * this.gameSpeed,
      width: width,
      x: x,
      y: y
    };
    
    this.backgroundLayers.push(layerGroup);
    return layerGroup;
  }
  
  // Update parallax layers
  updateParallaxLayers() {
    // Update each layer
    this.backgroundLayers.forEach(layer => {
      // Helper function to update a set of images
      const updateImages = (images) => {
        // Move all images of the layer
        images.forEach(image => {
          // Move the image based on its speed
          image.x -= layer.speed * (1/60);
        });
        
        // Get the leftmost and rightmost images
        const sortedImages = [...images].sort((a, b) => a.x - b.x);
        const leftmost = sortedImages[0];
        const rightmost = sortedImages[sortedImages.length - 1];
        
        // If the leftmost image has moved too far left
        if (leftmost.x < -layer.width) {
          // Place it to the right of the rightmost image
          leftmost.x = rightmost.x + layer.width;
        }
      };
      
      // Update both day and night versions
      updateImages(layer.dayImages);
      updateImages(layer.nightImages);
    });
  }
  
  // Update day/night cycle
  updateDayNightCycle(delta) {
    this.cycleTimer += delta;
    
    // Reset timer if it exceeds the cycle duration
    if (this.cycleTimer >= this.cycleDuration) {
      this.cycleTimer = 0;
    }
    
    // Calculate the transition progress
    const dayDuration = this.cycleDuration * this.dayNightRatio;
    const nightDuration = this.cycleDuration - dayDuration;
    
    let nightAlpha = 0;
    
    // During day-to-night transition
    if (this.cycleTimer > dayDuration - this.transitionDuration && 
        this.cycleTimer < dayDuration) {
      const transitionProgress = (this.cycleTimer - (dayDuration - this.transitionDuration)) / this.transitionDuration;
      nightAlpha = transitionProgress;
      
      // Update time indicator
      if (this.timeOfDay === 'day' && transitionProgress > 0.5) {
        this.timeOfDay = 'dusk';
        this.timeText.setText('Dusk');
      }
    }
    // During full night
    else if (this.cycleTimer >= dayDuration && 
             this.cycleTimer < this.cycleDuration - this.transitionDuration) {
      nightAlpha = 1;
      
      // Update time indicator
      if (this.timeOfDay !== 'night') {
        this.timeOfDay = 'night';
        this.timeText.setText('Night');
        this.timeText.setFill('#FFFFFF');
        this.scoreText.setFill('#FFFFFF');
      }
    }
    // During night-to-day transition
    else if (this.cycleTimer >= this.cycleDuration - this.transitionDuration) {
      const transitionProgress = (this.cycleTimer - (this.cycleDuration - this.transitionDuration)) / this.transitionDuration;
      nightAlpha = 1 - transitionProgress;
      
      // Update time indicator
      if (this.timeOfDay === 'night' && transitionProgress > 0.5) {
        this.timeOfDay = 'dawn';
        this.timeText.setText('Dawn');
      }
    }
    // During full day
    else {
      nightAlpha = 0;
      
      // Update time indicator
      if (this.timeOfDay !== 'day' && this.timeOfDay !== '') {
        this.timeOfDay = 'day';
        this.timeText.setText('Day');
        this.timeText.setFill('#000000');
        this.scoreText.setFill('#000000');
      }
    }
    
    // Apply the alpha to all night elements
    this.skyNight.setAlpha(nightAlpha);
    this.stars.setAlpha(nightAlpha * 0.8); // Stars are slightly less visible
    
    // Transition sun and moon
    this.sun.setAlpha(1 - nightAlpha);
    this.moon.setAlpha(nightAlpha);
    
    // Update all background layers
    this.backgroundLayers.forEach(layer => {
      layer.nightImages.forEach(image => {
        image.setAlpha(nightAlpha);
      });
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
    
    // Tint the obstacle at night
    if (this.timeOfDay === 'night') {
      obstacle.setTint(0x555555);
    }
    
    // Schedule next obstacle
    this.obstacleTimer = this.time.addEvent({
      delay: Phaser.Math.Between(1500, 3000),
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: false
    });
  }

  update(time, delta) {
    // Only update if game is not over
    if (!this.isGameOver) {
      // Update parallax layers
      this.updateParallaxLayers();
      
      // Update day/night cycle
      this.updateDayNightCycle(delta);
      
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
  
  // Reset the game scene
  resetScene() {
    // Reset all layers to their original positions
    this.backgroundLayers.forEach(layer => {
      for (let i = 0; i < 3; i++) {
        layer.dayImages[i].x = layer.x + ((i-1) * layer.width);
        layer.nightImages[i].x = layer.x + ((i-1) * layer.width);
      }
    });
    
    // Reset day/night cycle
    this.cycleTimer = 0;
    this.timeOfDay = 'day';
    
    // Reset visuals
    this.skyDay.setAlpha(1);
    this.skyNight.setAlpha(0);
    this.sun.setAlpha(1);
    this.moon.setAlpha(0);
    this.stars.setAlpha(0);
  }
}

// Rest of the code remains the same (LeaderboardScene and MainMenuScene)
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
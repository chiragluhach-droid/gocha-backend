const express = require('express');
const bcrypt = require('bcrypt');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const mongoose = require('mongoose');

const router = express.Router();

// GET /api/restaurants - Get all restaurants
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not connected' });
    }

    const restaurants = await Restaurant.find().sort({ createdAt: -1 });
    res.json({ restaurants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/restaurants/:id - Get single restaurant
router.get('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not connected' });
    }

    const restaurant = await Restaurant.findById(req.params.id).lean();
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Optionally include menu items if requested: ?includeMenu=true
    if (req.query.includeMenu === 'true') {
      const items = await MenuItem.find({ restaurant: restaurant._id, available: true }).lean();
      const map = new Map();
      items.forEach((it) => {
        const cat = it.category || 'Uncategorized';
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat).push({
          id: it._id,
          name: it.name,
          description: it.description,
          price: it.price,
          image: it.image,
          isVeg: it.isVeg,
          available: it.available,
          modifiers: it.modifiers || [],
          restaurantName: it.restaurantName || restaurant.name,
        });
      });
      const sections = Array.from(map.keys()).map((key) => ({ title: key, data: map.get(key) }));
      return res.json({ restaurant, sections });
    }

    res.json({ restaurant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/restaurants - Create new restaurant (admin only - for testing)
router.post('/', async (req, res) => {
  try {
    const { name, location, image, isOpen, waitTime, description, rating, vendorPasskey } = req.body;

    if (!name || !location || !image) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not connected' });
    }

    const restaurantData = {
      name,
      location,
      image,
      isOpen: isOpen !== undefined ? isOpen : true,
      waitTime: waitTime || 0,
      description: description || '',
      rating: rating || 4.5,
    };

    // If admin provided a passkey, hash and store it
    if (vendorPasskey) {
      try {
        restaurantData.vendorPasskey = await bcrypt.hash(String(vendorPasskey), 10);
      } catch (hashErr) {
        console.warn('Vendor passkey hashing failed', hashErr);
      }
    }

    const restaurant = new Restaurant(restaurantData);

    await restaurant.save();
    res.status(201).json({ restaurant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/restaurants/:id - Update restaurant fields (admin)
router.put('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: 'Database not connected' });

    const updates = req.body || {};
    // If admin sent a vendorPasskey, hash it before storing. If an empty value was sent, clear the passkey.
    if (Object.prototype.hasOwnProperty.call(updates, 'vendorPasskey')) {
      if (updates.vendorPasskey) {
        try {
          updates.vendorPasskey = await bcrypt.hash(String(updates.vendorPasskey), 10);
        } catch (hashErr) {
          console.warn('Failed hashing vendorPasskey', hashErr);
          // remove the vendorPasskey field to avoid storing bad value
          delete updates.vendorPasskey;
        }
      } else {
        // explicit clearing
        updates.vendorPasskey = '';
      }
    }

    const opts = { new: true };
    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, updates, opts).lean();
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    // Emit update to sockets
    try {
      const io = req.app.get('io');
      if (io) io.emit('restaurant.updated', { id: restaurant._id, updates });
    } catch (emitErr) {
      console.warn('Emit restaurant.updated failed', emitErr);
    }

    res.json({ restaurant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/restaurants/:id/menu - Return menu sections for a restaurant (DB-backed)
router.get('/:id/menu', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not connected' });
    }

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    // Fetch menu items for this restaurant
    // Allow vendor to request unavailable items via ?includeUnavailable=true
    const includeUnavailable = req.query.includeUnavailable === 'true';
    const findQuery = { restaurant: restaurant._id };
    if (!includeUnavailable) findQuery.available = true;
    const items = await MenuItem.find(findQuery).lean();

    // Group by category
    const map = new Map();
    items.forEach((it) => {
      const cat = it.category || 'Uncategorized';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push({
        id: it._id,
        name: it.name,
        description: it.description,
        price: it.price,
        image: it.image,
        isVeg: it.isVeg,
        available: it.available,
        modifiers: it.modifiers || [],
      });
    });

    const sections = Array.from(map.keys()).map((key) => ({ title: key, data: map.get(key) }));

    res.json({
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        image: restaurant.image,
        location: restaurant.location,
        isOpen: restaurant.isOpen,
        waitTime: restaurant.waitTime,
        rating: restaurant.rating,
      },
      sections,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/restaurants/:id/menu/items - Create a menu item for a restaurant
router.post('/:id/menu/items', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: 'Database not connected' });

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    const { name, description, price, image, category, isVeg, available, modifiers } = req.body;
    if (!name || price === undefined) return res.status(400).json({ message: 'Missing name or price' });

    const item = new MenuItem({
      restaurant: restaurant._id,
      restaurantName: restaurant.name,
      name,
      description: description || '',
      price,
      image: image || '',
      category: category || 'Uncategorized',
      isVeg: isVeg !== undefined ? isVeg : true,
      available: available !== undefined ? available : true,
      modifiers: modifiers || [],
    });

    await item.save();
    // Emit menu update to restaurant room if Socket.IO available
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`restaurant:${restaurant._id}`).emit('menu.updated', { action: 'created', item: { id: item._id, name: item.name, price: item.price, description: item.description, category: item.category } });
      }
    } catch (emitErr) {
      console.warn('Emit menu.created failed', emitErr);
    }

    res.status(201).json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/menu/items/:itemId - Update a menu item
router.put('/menu/items/:itemId', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: 'Database not connected' });

    const updates = req.body || {};
    const item = await MenuItem.findByIdAndUpdate(req.params.itemId, updates, { new: true });
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    // Emit menu update to restaurant room if Socket.IO available
    try {
      const io = req.app.get('io');
      if (io) {
        const rid = item.restaurant || null;
        if (rid) io.to(`restaurant:${rid}`).emit('menu.updated', { action: 'updated', item: { id: item._id, name: item.name, available: item.available } });
        else io.emit('menu.updated', { action: 'updated', item: { id: item._id, name: item.name, available: item.available } });
      }
    } catch (emitErr) {
      console.warn('Emit menu.updated failed', emitErr);
    }
    res.json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/menu/items/:itemId - Remove a menu item
router.delete('/menu/items/:itemId', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: 'Database not connected' });

    const item = await MenuItem.findByIdAndDelete(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    // Emit menu deletion
    try {
      const io = req.app.get('io');
      if (io) {
        // If item had restaurant ref, use it; otherwise broadcast generically
        const rid = item.restaurant || req.params.restaurantId || null;
        if (rid) io.to(`restaurant:${rid}`).emit('menu.updated', { action: 'deleted', itemId: req.params.itemId });
        else io.emit('menu.updated', { action: 'deleted', itemId: req.params.itemId });
      }
    } catch (emitErr) {
      console.warn('Emit menu.deleted failed', emitErr);
    }

    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/restaurants/:id - Delete a restaurant and its menu items
router.delete('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: 'Database not connected' });

    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    // Remove associated menu items
    try {
      await MenuItem.deleteMany({ restaurant: restaurant._id });
    } catch (delErr) {
      console.warn('Failed to delete related menu items', delErr);
    }

    // Notify via socket if available
    try {
      const io = req.app.get('io');
      if (io) io.emit('restaurant.deleted', { id: restaurant._id });
    } catch (emitErr) {
      console.warn('Emit restaurant.deleted failed', emitErr);
    }

    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

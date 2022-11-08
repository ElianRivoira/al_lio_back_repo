const express = require("express");
const router = express.Router();
const { getAllProducts, getProductsWithFilters, getOneProduct, createProduct, deleteProduct, editProduct } = require("../controllers/products");

router.get("/", getAllProducts);

router.get("/search", getProductsWithFilters);

router.get("/:id", getOneProduct);

router.post("/", createProduct);

router.delete("/:id", deleteProduct);

router.put("/:id", editProduct);

module.exports = router;

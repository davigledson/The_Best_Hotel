package com.the.best.hotel.theBestHotel.controller;

import com.the.best.hotel.theBestHotel.model.Product;
import com.the.best.hotel.theBestHotel.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<List<Product>> findAll() {
        return ResponseEntity.ok(productService.findAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<Product>> findActive() {
        return ResponseEntity.ok(productService.findByActive(true));
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<Product>> findByCategory(@PathVariable String category) {
        return ResponseEntity.ok(productService.findByCategory(category));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> findById(@PathVariable String id) {
        return ResponseEntity.ok(productService.findById(new ObjectId(id)));
    }

    @PostMapping
    public ResponseEntity<Product> create(@RequestBody Product product) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(product));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Product> update(@PathVariable String id, @RequestBody Product product) {
        return ResponseEntity.ok(productService.update(new ObjectId(id), product));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        productService.delete(new ObjectId(id));
        return ResponseEntity.noContent().build();
    }
}
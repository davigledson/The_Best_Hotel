package com.the.best.hotel.theBestHotel.service;

import com.the.best.hotel.theBestHotel.model.Product;
import com.the.best.hotel.theBestHotel.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    public List<Product> findAll() {
        return productRepository.findAll();
    }

    public List<Product> findByActive(boolean active) {
        return productRepository.findByActive(active);
    }

    public List<Product> findByCategory(String category) {
        return productRepository.findByCategory(category);
    }

    public Product findById(ObjectId id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
    }

    public Product create(Product product) {
        if (product.getCategory() == null || product.getCategory().isBlank()) {
            throw new RuntimeException("Categoria do produto é obrigatória");
        }
        if (productRepository.existsByName(product.getName())) {
            throw new RuntimeException("Nome do produto já existe");
        }
        product.setActive(true);
        return productRepository.save(product);
    }

    public Product update(ObjectId id, Product updated) {
        Product existing = findById(id);
        if (updated.getCategory() == null || updated.getCategory().isBlank()) {
            throw new RuntimeException("Categoria do produto é obrigatória");
        }
        if (updated.getName() != null && !updated.getName().equals(existing.getName())
                && productRepository.existsByName(updated.getName())) {
            throw new RuntimeException("Nome do produto já existe");
        }
        existing.setName(updated.getName());
        existing.setCategory(updated.getCategory());
        existing.setPrice(updated.getPrice());
        existing.setActive(updated.isActive());
        return productRepository.save(existing);
    }

    public void delete(ObjectId id) {
        productRepository.deleteById(id);
    }
}